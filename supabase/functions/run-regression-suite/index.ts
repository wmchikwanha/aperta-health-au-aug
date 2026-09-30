import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { serviceClient, sha256Hex } from "../_shared/ai-registry.ts";
import { checkCaseOutput, summariseRun, EVAL_SUITE_VERSION, type CaseCheck } from "../_shared/governance.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const FUNCTION_FOR_SLOT: Record<string, string> = { narrative: "process-narrative", reasoning: "process-narrative" };
const MAX_CASES = 24;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
    const { data: userData } = await userClient.auth.getUser(authorization.slice(7));
    const userId = userData?.user?.id;
    if (!userId) return json({ error: "Unauthorized" }, 401);
    const svc = serviceClient();
    const { data: isAdmin } = await svc.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden — admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const modelVersionId = typeof body?.model_version_id === "string" ? body.model_version_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(modelVersionId)) return json({ error: "model_version_id is required" }, 400);

    const { data: mv } = await svc.from("model_versions").select("*").eq("id", modelVersionId).maybeSingle();
    if (!mv) return json({ error: "Model version not found" }, 404);
    const functionName = FUNCTION_FOR_SLOT[mv.slot] ?? "process-narrative";

    const [{ data: prompt }, { data: preamble }, { data: cases }] = await Promise.all([
      svc.from("prompt_templates").select("*").eq("function_name", functionName).eq("status", "active").maybeSingle(),
      svc.from("ai_safety_preambles").select("*").eq("is_current", true).maybeSingle(),
      svc.from("golden_cases").select("*").eq("function_name", functionName).eq("active", true).limit(MAX_CASES),
    ]);
    if (!prompt || !preamble) return json({ error: "Active prompt or safety preamble missing" }, 503);
    if (!cases?.length) return json({ error: "No active golden cases" }, 422);

    const preamblePresent = (await sha256Hex(preamble.preamble_text)) === preamble.preamble_hash && prompt.safety_preamble_hash === preamble.preamble_hash;
    const systemPrompt = `${preamble.preamble_text}\n\n${prompt.system_prompt}`;
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI service is not configured" }, 500);

    const perCase: Array<{ case_id: string; language: string; checks: CaseCheck; status?: number }> = [];
    let blocked: number | null = null;
    // Small sequential batches share the workspace rate budget.
    for (let i = 0; i < cases.length && blocked === null; i += 4) {
      const batch = cases.slice(i, i + 4);
      const results = await Promise.all(batch.map(async (c: any) => {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model: mv.model_id, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: c.input_text }], response_format: { type: "json_object" } }),
        });
        if (!r.ok) {
          await r.text();
          return { c, content: null, status: r.status };
        }
        const d = await r.json();
        return { c, content: d?.choices?.[0]?.message?.content ?? null, status: 200 };
      }));
      for (const { c, content, status } of results) {
        if ([402, 403, 429].includes(status)) blocked = status;
        perCase.push({ case_id: c.id, language: c.language, status, checks: checkCaseOutput(content, c.expected_output_schema, c.expects_idiom_flag) });
      }
    }
    if (blocked !== null) return json({ error: `Regression halted: AI gateway returned ${blocked}. No result recorded.` }, blocked);

    const { passed, summary } = summariseRun(perCase.map((p) => p.checks), preamblePresent);
    const { data: evalRow, error } = await svc.from("eval_results").insert({
      model_version_id: mv.id, prompt_template_id: prompt.id, eval_suite_version: EVAL_SUITE_VERSION,
      passed, score: { ...summary, per_case: perCase }, run_by: userId,
    }).select().single();
    if (error) throw error;
    await svc.from("audit_events").insert({
      actor_id: userId, actor_role: "admin", action: "regression_suite_run", outcome: passed ? "success" : "failure",
      resource_type: "model_version", resource_id: mv.id, description: `Regression ${passed ? "passed" : "failed"} for ${mv.model_id}`,
      metadata: { eval_result_id: evalRow.id, ...summary }, source: "run-regression-suite",
    });
    return json({ passed, summary, eval_result_id: evalRow.id });
  } catch (e) {
    console.error("run-regression-suite error", e);
    return json({ error: e instanceof Error ? e.message : "Regression failed" }, 500);
  }
});
