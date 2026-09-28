import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

const SYSTEM_PROMPT = `You are a clinical information extraction and translation aid for Australian refugee, CALD, and Aboriginal and Torres Strait Islander mental-health services.
STRICT SCOPE:
- Extract only facts explicitly stated. Never infer a diagnosis, severity, triage level, screening score, treatment, medication, or crisis decision.
- Do not complete absent MSE information. Use "Not stated in narrative".
- Preserve uncertainty and attribute statements to the speaker.
- Translate non-English speech into English while preserving important original-language phrases.
- Identify cultural idioms and explain possible cultural meaning without mapping them to a disorder.
- Never generate medication dosages. This is documentation support only and requires clinician review.
Return only JSON:
{"review_notice":"AI-generated suggestion requiring clinical review","language_detected":"","translation":"","cultural_idioms_found":[],"culturalNotes":[],"appearance":"explicit observations only","speech":"explicit observations only","mood":"patient-reported or observed facts only","perception":"explicitly reported facts only","risk":"explicit risk statements only; no classification","extracted_entities":{"symptoms":[],"reported_experiences":[],"protective_factors":[],"psychosocial_stressors":[],"medication_mentions":[],"risk_phrases":[],"uncertainties":[]}}`;

serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authenticate(req);
    if (auth.response) return auth.response;
    const body = await req.json().catch(() => null);
    const narrative = typeof body?.narrative === "string" ? body.narrative.trim() : "";
    if (!narrative || narrative.length > 30000) return jsonResponse({ error: "Narrative must contain between 1 and 30,000 characters" }, 400);
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return jsonResponse({ error: "AI service is not configured" }, 500);
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: "google/gemini-2.5-pro", messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: narrative }], response_format: { type: "json_object" } }) });
    if (!aiResponse.ok) return jsonResponse({ error: `AI service error: ${aiResponse.status}` }, aiResponse.status === 402 || aiResponse.status === 429 ? aiResponse.status : 500);
    const aiData = await aiResponse.json();
    const content = aiData?.choices?.[0]?.message?.content;
    const result = typeof content === "string" ? JSON.parse(content) : content;
    if (!result?.extracted_entities || typeof result.language_detected !== "string") return jsonResponse({ error: "AI returned an invalid extraction" }, 502);
    delete result.hasRedAlert; delete result.risk_level; delete result.clinical_impressions;
    const output = { ...result, ai_generated: true, model_id: "google/gemini-2.5-pro", prompt_template_id: "narrative-extraction", prompt_template_version: "1.0.0-batch1" };
    return new Response(`data: ${JSON.stringify({ result: output })}\n\ndata: [DONE]\n\n`, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  } catch (error) {
    console.error("process-narrative error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to process narrative" }, 500);
  }
});