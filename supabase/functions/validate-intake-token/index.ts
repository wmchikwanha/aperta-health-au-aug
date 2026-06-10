import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { action, token, ...payload } = await req.json();

    // ── VALIDATE TOKEN ──────────────────────────────────────────
    if (action === "validate") {
      if (!token || typeof token !== "string" || token.length < 32) {
        return json({ error: "Invalid token" }, 400);
      }

      const { data: session, error } = await supabase
        .from("patient_intake_sessions")
        .select("id, status, tier, language_code, expires_at, demographics, patient_id, clinician_id")
        .eq("token", token)
        .single();

      if (error || !session) return json({ error: "Session not found" }, 404);
      if (session.status === "expired" || new Date(session.expires_at) < new Date()) {
        await supabase.from("patient_intake_sessions").update({ status: "expired" }).eq("id", session.id);
        return json({ error: "This link has expired" }, 410);
      }
      if (session.status === "completed" || session.status === "reviewed") {
        return json({ error: "This intake has already been completed" }, 409);
      }

      // Mark as in_progress if pending
      if (session.status === "pending") {
        await supabase.from("patient_intake_sessions").update({ status: "in_progress", started_at: new Date().toISOString() }).eq("id", session.id);
      }

      return json({ session: { id: session.id, tier: session.tier, language_code: session.language_code, demographics: session.demographics, status: "in_progress" } });
    }

    // ── SAVE CONSENTS ───────────────────────────────────────────
    if (action === "save_consents") {
      const { session_id, consents, ip_hash } = payload;
      if (!session_id || !Array.isArray(consents)) return json({ error: "Missing fields" }, 400);

      const rows = consents.map((c: any) => ({
        session_id,
        consent_type: c.consent_type,
        granted: c.granted,
        consent_text_version: c.consent_text_version || "1.0",
        language_code: c.language_code || "en",
        ip_hash: ip_hash || null,
      }));

      const { error } = await supabase.from("patient_intake_consents").insert(rows);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ── SAVE DEMOGRAPHICS ───────────────────────────────────────
    if (action === "save_demographics") {
      const { session_id, demographics, language_code } = payload;
      if (!session_id) return json({ error: "Missing session_id" }, 400);

      const update: any = { demographics };
      if (language_code) update.language_code = language_code;

      const { error } = await supabase.from("patient_intake_sessions").update(update).eq("id", session_id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ── SAVE SCREENING RESPONSE ─────────────────────────────────
    if (action === "save_screening") {
      const { session_id, tool_type, responses, total_score, severity_level, interpretation, item_flags } = payload;
      if (!session_id || !tool_type) return json({ error: "Missing fields" }, 400);

      const { error } = await supabase.from("patient_intake_responses").insert({
        session_id,
        tool_type,
        responses,
        total_score,
        severity_level,
        interpretation,
        item_flags: item_flags || {},
      });
      if (error) return json({ error: error.message }, 500);

      // Update risk flags if suicidal ideation detected
      if (item_flags && (item_flags.flag === "suicidal_ideation" || item_flags.immediate_review)) {
        await supabase.from("patient_intake_sessions").update({
          risk_flags: { immediate_review: true, flagged_tool: tool_type, ...item_flags },
        }).eq("id", session_id);
      }

      return json({ success: true });
    }

    // ── SAVE NARRATIVE ──────────────────────────────────────────
    if (action === "save_narrative") {
      const { session_id, narrative_text } = payload;
      if (!session_id) return json({ error: "Missing session_id" }, 400);

      const { error } = await supabase.from("patient_intake_sessions").update({ narrative_text }).eq("id", session_id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ── COMPLETE INTAKE ─────────────────────────────────────────
    if (action === "complete") {
      const { session_id } = payload;
      if (!session_id) return json({ error: "Missing session_id" }, 400);

      const { error } = await supabase.from("patient_intake_sessions").update({
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("id", session_id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ── GENERATE INTAKE LINK (clinician-side) ───────────────────
    if (action === "generate_link") {
      const { patient_id, clinician_id, tier, clinic_code } = payload;
      if (!clinician_id) return json({ error: "Missing clinician_id" }, 400);

      // Generate a cryptographically random token
      const tokenBytes = new Uint8Array(32);
      crypto.getRandomValues(tokenBytes);
      const generatedToken = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, "0")).join("");

      const { data, error } = await supabase.from("patient_intake_sessions").insert({
        token: generatedToken,
        patient_id: patient_id || null,
        clinician_id,
        tier: tier || "basic",
        clinic_code: clinic_code || null,
      }).select("id, token").single();

      if (error) return json({ error: error.message }, 500);
      return json({ token: data.token, session_id: data.id });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("validate-intake-token error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
