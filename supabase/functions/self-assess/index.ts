import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Crockford-ish base32, no ambiguous chars (no 0/O/1/I/L/U)
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

function randomCode(len: number) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return s;
}

function generateReferralCode() {
  return `NZW-${randomCode(4)}-${randomCode(4)}`;
}

function generatePin() {
  const b = new Uint8Array(2);
  crypto.getRandomValues(b);
  const n = ((b[0] << 8) | b[1]) % 10000;
  return n.toString().padStart(4, "0");
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Hash with a per-session salt (the referral_code itself acts as the salt — code is the public part, pin is the secret)
async function hashPin(pin: string, code: string) {
  return await sha256(`${code}::${pin}::nzw-v1`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    const { action, session_token } = body;

    // ── START SESSION ──────────────────────────────────────────
    if (action === "start") {
      const { language_code } = body;

      // Generate referral code + PIN — retry on collision
      let referralCode = "";
      for (let i = 0; i < 5; i++) {
        const candidate = generateReferralCode();
        const { data: existing } = await supabase
          .from("self_assessment_sessions")
          .select("id")
          .eq("referral_code", candidate)
          .maybeSingle();
        if (!existing) { referralCode = candidate; break; }
      }
      if (!referralCode) return json({ error: "Could not allocate referral code" }, 500);

      const pin = generatePin();
      const pinHash = await hashPin(pin, referralCode);

      const { data, error } = await supabase
        .from("self_assessment_sessions")
        .insert({
          language_code: language_code || "en",
          referral_code: referralCode,
          verification_pin_hash: pinHash,
        })
        .select("id, session_token, language_code, status, referral_code")
        .single();

      if (error) return json({ error: error.message }, 500);
      // Return plaintext PIN to client — shown at end of assessment, then forgotten
      return json({ session: data, verification_pin: pin });
    }

    // ── ANONYMOUS LOOKUP via referral code + PIN ───────────────
    if (action === "lookup" || action === "post_message" || action === "add_contact") {
      const { referral_code, pin } = body;
      if (!referral_code || !pin) return json({ error: "Referral code and PIN required" }, 400);

      const { data: session, error } = await supabase
        .from("self_assessment_sessions")
        .select("*")
        .eq("referral_code", referral_code)
        .maybeSingle();

      if (error || !session) return json({ error: "Referral not found" }, 404);

      // Brute-force lockout
      if (session.pin_locked_until && new Date(session.pin_locked_until) > new Date()) {
        return json({ error: "Too many incorrect attempts. Please try again later." }, 429);
      }

      const expected = await hashPin(pin, referral_code);
      if (expected !== session.verification_pin_hash) {
        const attempts = (session.pin_failed_attempts || 0) + 1;
        const lockUntil = attempts >= 5 ? new Date(Date.now() + 60 * 60 * 1000).toISOString() : null;
        await supabase
          .from("self_assessment_sessions")
          .update({ pin_failed_attempts: attempts, pin_locked_until: lockUntil })
          .eq("id", session.id);
        return json({ error: "Incorrect PIN" }, 401);
      }

      // Reset failure counter on success
      if (session.pin_failed_attempts > 0 || session.pin_locked_until) {
        await supabase
          .from("self_assessment_sessions")
          .update({ pin_failed_attempts: 0, pin_locked_until: null })
          .eq("id", session.id);
      }

      // ── LOOKUP ──
      if (action === "lookup") {
        const { data: referrals } = await supabase
          .from("facility_referrals")
          .select("id, status, matched_at, accepted_at, facility_id, facilities:facility_id(facility_name, city, region, contact_phone, contact_email)")
          .eq("session_id", session.id);

        const { data: messages } = await supabase
          .from("referral_messages")
          .select("id, facility_id, sender, body, created_at, read_at")
          .eq("session_id", session.id)
          .order("created_at", { ascending: true });

        return json({
          session: {
            referral_code: session.referral_code,
            risk_level: session.risk_level,
            created_at: session.created_at,
            status: session.status,
            contact_name: session.contact_name,
            contact_phone: session.contact_phone,
            contact_email: session.contact_email,
          },
          referrals: referrals || [],
          messages: messages || [],
        });
      }

      // ── POST MESSAGE (self_assessor) ──
      if (action === "post_message") {
        const { facility_id, message } = body;
        if (!facility_id || !message || typeof message !== "string" || message.trim().length === 0) {
          return json({ error: "facility_id and non-empty message required" }, 400);
        }
        if (message.length > 4000) return json({ error: "Message too long" }, 400);

        // Verify the facility is one this session was actually matched to
        const { data: match } = await supabase
          .from("facility_referrals")
          .select("id")
          .eq("session_id", session.id)
          .eq("facility_id", facility_id)
          .maybeSingle();
        if (!match) return json({ error: "Facility not matched to this referral" }, 403);

        const { error: insErr } = await supabase.from("referral_messages").insert({
          session_id: session.id,
          facility_id,
          sender: "self_assessor",
          body: message.trim(),
        });
        if (insErr) return json({ error: insErr.message }, 500);
        return json({ success: true });
      }

      // ── ADD OPTIONAL CONTACT ──
      if (action === "add_contact") {
        const { contact_name, contact_phone, contact_email } = body;
        const update: any = {};
        if (typeof contact_name === "string") update.contact_name = contact_name.trim().slice(0, 200) || null;
        if (typeof contact_phone === "string") update.contact_phone = contact_phone.trim().slice(0, 50) || null;
        if (typeof contact_email === "string") update.contact_email = contact_email.trim().slice(0, 200) || null;

        const { error: upErr } = await supabase
          .from("self_assessment_sessions")
          .update(update)
          .eq("id", session.id);
        if (upErr) return json({ error: upErr.message }, 500);
        return json({ success: true });
      }
    }

    // All token-based actions require a session_token
    if (!session_token || typeof session_token !== "string") {
      return json({ error: "Missing or invalid session_token" }, 400);
    }

    const { data: session, error: sessionErr } = await supabase
      .from("self_assessment_sessions")
      .select("*")
      .eq("session_token", session_token)
      .single();

    if (sessionErr || !session) return json({ error: "Session not found" }, 404);
    if (new Date(session.expires_at) < new Date()) {
      await supabase.from("self_assessment_sessions").update({ status: "expired" }).eq("id", session.id);
      return json({ error: "This session has expired" }, 410);
    }

    // ── SAVE CONSENTS ──────────────────────────────────────────
    if (action === "save_consents") {
      const { consents, ip_hash } = body;
      if (!Array.isArray(consents) || consents.length === 0) return json({ error: "Consents are required" }, 400);

      const rows = consents.map((c: any) => ({
        session_id: session.id,
        consent_type: c.consent_type,
        granted: c.granted,
        consent_text_version: c.consent_text_version || "1.0",
        language_code: session.language_code || "en",
        ip_hash: ip_hash || null,
      }));

      const { error } = await supabase.from("self_assessment_consents").insert(rows);
      if (error) return json({ error: error.message }, 500);

      await supabase.from("self_assessment_sessions").update({ status: "consented" }).eq("id", session.id);
      return json({ success: true });
    }

    // ── SAVE DEMOGRAPHICS ──────────────────────────────────────
    if (action === "save_demographics") {
      const { demographics, location_region } = body;
      if (!demographics) return json({ error: "Demographics required" }, 400);

      const { error } = await supabase.from("self_assessment_sessions").update({
        demographics,
        location_region: location_region || null,
        status: "demographics_complete",
      }).eq("id", session.id);

      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ── SAVE SCREENING ─────────────────────────────────────────
    if (action === "save_screening") {
      const { tool_type, responses, total_score, severity_level, interpretation, item_flags } = body;
      if (!tool_type || !responses) return json({ error: "Missing screening data" }, 400);

      const { error } = await supabase.from("self_assessment_responses").insert({
        session_id: session.id,
        tool_type,
        responses,
        total_score: total_score || 0,
        severity_level,
        interpretation,
        item_flags: item_flags || {},
      });

      if (error) return json({ error: error.message }, 500);

      const isCrisis = item_flags?.suicidal_ideation || item_flags?.immediate_review;
      if (isCrisis) {
        await supabase.from("self_assessment_sessions").update({
          risk_level: "CRISIS",
          status: "screening_complete",
        }).eq("id", session.id);
      } else {
        await supabase.from("self_assessment_sessions").update({
          status: "screening_complete",
        }).eq("id", session.id);
      }

      return json({ success: true, crisis: !!isCrisis });
    }

    // ── SAVE NARRATIVE ─────────────────────────────────────────
    if (action === "save_narrative") {
      const { narrative_text } = body;

      const { error } = await supabase.from("self_assessment_sessions").update({
        narrative_text: narrative_text || null,
        status: "narrative_complete",
      }).eq("id", session.id);

      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ── COMPLETE (AI TRIAGE) ───────────────────────────────────
    if (action === "complete") {
      const { data: screeningData } = await supabase
        .from("self_assessment_responses")
        .select("*")
        .eq("session_id", session.id);

      let riskLevel = session.risk_level || "LOW";

      if (screeningData && screeningData.length > 0) {
        for (const resp of screeningData) {
          if (resp.item_flags?.suicidal_ideation || resp.item_flags?.immediate_review) {
            riskLevel = "CRISIS";
            break;
          }
          if (resp.severity_level === "severe" || resp.severity_level === "moderately_severe") {
            riskLevel = riskLevel === "CRISIS" ? "CRISIS" : "HIGH";
          } else if (resp.severity_level === "moderate" && riskLevel === "LOW") {
            riskLevel = "MODERATE";
          }
        }
      }

      let triageResult: any = { risk_level: riskLevel, recommendations: [] };

      if (session.narrative_text && riskLevel !== "CRISIS") {
        try {
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          if (LOVABLE_API_KEY) {
            const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [{
                  role: "system",
                  content: `You are a mental health triage assistant. Analyse the following self-reported narrative for risk indicators. You must NOT diagnose. Output ONLY valid JSON with this structure:
{"risk_level": "LOW|MODERATE|HIGH|CRISIS", "risk_indicators": ["indicator1"], "recommended_services": ["service1"], "urgency_note": "brief note"}
If the person mentions self-harm, suicide, or harm to others, set risk_level to CRISIS.`
                }, {
                  role: "user",
                  content: session.narrative_text,
                }],
              }),
            });

            if (aiResponse.ok) {
              const aiResult = await aiResponse.json();
              const content = aiResult.choices?.[0]?.message?.content || "";
              try {
                const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
                if (parsed.risk_level === "CRISIS" || parsed.risk_level === "HIGH") {
                  riskLevel = parsed.risk_level;
                }
                triageResult = { ...triageResult, ...parsed, risk_level: riskLevel };
              } catch { /* fall back */ }
            }
          }
        } catch (e) {
          console.error("AI triage error (non-fatal):", e);
        }
      }

      let matchedFacilities: any[] = [];
      if (session.location_region) {
        const query = supabase
          .from("facilities")
          .select("id, facility_name, region, city, contact_phone, contact_email, website, services_offered, specialisations, emergency_capable")
          .eq("is_active", true)
          .eq("accepts_referrals", true);

        if (riskLevel === "CRISIS") {
          const { data: emergencyFacilities } = await query.eq("emergency_capable", true).eq("region", session.location_region).limit(3);
          matchedFacilities = emergencyFacilities || [];
        }

        if (matchedFacilities.length === 0) {
          const { data: regionalFacilities } = await supabase
            .from("facilities")
            .select("id, facility_name, region, city, contact_phone, contact_email, website, services_offered, specialisations, emergency_capable")
            .eq("is_active", true)
            .eq("accepts_referrals", true)
            .eq("region", session.location_region)
            .limit(5);
          matchedFacilities = regionalFacilities || [];
        }
      }

      if (matchedFacilities.length > 0) {
        const referralRows = matchedFacilities.map((f) => ({
          session_id: session.id,
          facility_id: f.id,
          status: riskLevel === "CRISIS" ? "urgent" : "pending",
        }));
        await supabase.from("facility_referrals").insert(referralRows);
      }

      await supabase.from("self_assessment_sessions").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        risk_level: riskLevel,
        triage_result: triageResult,
      }).eq("id", session.id);

      return json({
        success: true,
        risk_level: riskLevel,
        referral_code: session.referral_code,
        facilities: matchedFacilities.map((f) => ({
          id: f.id,
          name: f.facility_name,
          city: f.city,
          phone: f.contact_phone,
          email: f.contact_email,
          website: f.website,
          services: f.services_offered,
          emergency: f.emergency_capable,
        })),
        is_crisis: riskLevel === "CRISIS",
        recommendations: triageResult.recommendations || triageResult.recommended_services || [],
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("self-assess error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
