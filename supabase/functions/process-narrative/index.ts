import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { loadAIConfig, AIConfigError } from "../_shared/ai-registry.ts";
import { guardInput, wrapUserContent } from "../_shared/input-guard.ts";
import { callWithValidation, logInference, SCHEMAS, FAIL_SAFE_MESSAGE, findCulturalFlags, loadDoNotPathologise } from "../_shared/output-guard.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const CLINICAL_ROLES = ["admin", "psychiatrist", "clinical_nurse"];
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function authenticate(req: Request) {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return { response: jsonResponse({ error: "No token provided" }, 401) };
  const client = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: authorization } } });
  const { data, error } = await client.auth.getUser(authorization.slice(7));
  if (error || !data.user) return { response: jsonResponse({ error: "Unauthorized — invalid token" }, 401) };
  const service = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const { data: roles } = await service.from("user_roles").select("role").eq("user_id", data.user.id);
  if (!roles?.[0]?.role || !CLINICAL_ROLES.includes(roles[0].role)) return { response: jsonResponse({ error: "Forbidden — insufficient role" }, 403) };
  return { userId: data.user.id, role: roles[0].role };
}

serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authenticate(req);
    if (auth.response) return auth.response;
    const body = await req.json().catch(() => null);
    const narrative = typeof body?.narrative === "string" ? body.narrative.trim() : "";
    if (!narrative || narrative.length > 30000) return jsonResponse({ error: "Narrative must contain between 1 and 30,000 characters" }, 400);
    let config;
    try { config = await loadAIConfig("process-narrative"); } catch (e) { if (e instanceof AIConfigError) return jsonResponse({ error: e.message }, 503); throw e; }
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return jsonResponse({ error: "AI service is not configured" }, 500);
    const guard = guardInput(narrative, 30000);
    const call = () => fetch("https://ai.gateway.lovable.dev/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: config.model, messages: [{ role: "system", content: config.systemPrompt }, { role: "user", content: wrapUserContent(guard.text, "patient_narrative") }], response_format: { type: "json_object" } }) });
    const outcome = await callWithValidation<any>(call, SCHEMAS["process-narrative"]);
    const base = { function_name: "process-narrative", actor_id: auth.userId, model_id: config.provenance.model_id, prompt_template_id: config.provenance.prompt_template_id, attempts: outcome.attempts, injection_patterns: guard.detections, pii: guard.pii, input_chars: narrative.length };
    if (outcome.gatewayStatus) return jsonResponse({ error: `AI service error: ${outcome.gatewayStatus}` }, outcome.gatewayStatus);
    if (!outcome.ok) {
      await logInference({ ...base, schema_valid: false, dosage_blocked: outcome.dosageBlocked, failure_reason: outcome.reason });
      return jsonResponse({ error: FAIL_SAFE_MESSAGE, failSafe: true }, 422);
    }
    const result = outcome.value;
    delete result.hasRedAlert; delete result.risk_level; delete result.clinical_impressions;
    const culturalFlags = findCulturalFlags(narrative, JSON.stringify(result), await loadDoNotPathologise());
    await logInference({ ...base, schema_valid: true, cultural_flags: culturalFlags });
    const output = { ...result, ai_generated: true, ...config.provenance, safety: { pii_scrubbed: guard.pii, injection_detected: guard.detections.length > 0, injection_patterns: guard.detections, cultural_flags: culturalFlags } };
    return new Response(`data: ${JSON.stringify({ result: output })}\n\ndata: [DONE]\n\n`, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  } catch (error) {
    console.error("process-narrative error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to process narrative" }, 500);
  }
});