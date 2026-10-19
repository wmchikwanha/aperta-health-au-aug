import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { clientIpHash, rateLimit, logAnomaly, UNIFORM_NOT_FOUND } from "../_shared/public-guard.ts";

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
    const ipHash = await clientIpHash(req);
    if (!(await rateLimit("intake-ip", ipHash, 60, 300))) {
      await logAnomaly("validate-intake-token", "ip_rate_limited", ipHash);
      return json({ error: "Too many requests. Please wait a few minutes and try again." }, 429);
    }
    const { action, token, ...payload } = await req.json();

    // ── VALIDATE TOKEN ──────────────────────────────────────────
    if (action === "validate") {
      if (!(await rateLimit("intake-validate-ip", ipHash, 10, 600))) {
        await logAnomaly("validate-intake-token", "token_probe_rate_limited", ipHash);
        return json({ error: "Too many attempts. Please wait and try again." }, 429);
      }
      if (!token || typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) {
        await logAnomaly("validate-intake-token", "malformed_token", ipHash);
        return json({ error: UNIFORM_NOT_FOUND }, 404);
      }

      const { data: session, error } = await supabase
        .from("patient_intake_sessions")
        .select("id, status, tier, language_code, expires_at, demographics, patient_id, clinician_id, token_used_at")
        .eq("token", token)
        .single();

      if (error || !session) { await logAnomaly("validate-intake-token", "unknown_token", ipHash); return json({ error: UNIFORM_NOT_FOUND }, 404); }
      if (session.status === "expired" || new Date(session.expires_at) < new Date()) {
        await supabase.from("patient_intake_sessions").update({ status: "expired" }).eq("id", session.id);
        return json({ error: UNIFORM_NOT_FOUND }, 404);
      }
      if (session.status === "completed" || session.status === "reviewed") {
        return json({ error: UNIFORM_NOT_FOUND }, 404);
      }
      if (!(await rateLimit("intake-token", token.slice(0, 16), 30, 3600))) {
        await logAnomaly("validate-intake-token", "token_rate_limited", ipHash);
        return json({ error: "Too many requests. Please wait and try again." }, 429);
      }

      // Mark as in_progress if pending
      if (session.status === "pending") {
        await supabase.from("patient_intake_sessions").update({ status: "in_progress", started_at: new Date().toISOString(), token_used_at: new Date().toISOString() }).eq("id", session.id);
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
        expires_at: new Date().toISOString(),
      }).eq("id", session_id).in("status", ["pending", "in_progress"]);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ── GENERATE INTAKE LINK (clinician-side) ───────────────────
    if (action === "generate_link") {
      const { patient_id, tier, clinic_code } = payload;
      const authz = req.headers.get("Authorization") ?? "";
      const { data: authUser } = await supabase.auth.getUser(authz.replace(/^Bearer\s+/i, ""));
      const clinician_id = authUser?.user?.id;
      if (!clinician_id) return json({ error: "Unauthorized" }, 401);

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
        expires_at: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      }).select("id, token").single();

      if (error) return json({ error: error.message }, 500);
      return json({ token: data.token, session_id: data.id });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("validate-intake-token error:", e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
