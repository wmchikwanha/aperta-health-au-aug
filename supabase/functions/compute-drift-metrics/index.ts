// Weekly per-function, per-language drift calculation. No AI calls; idempotent upsert.
import { serviceClient } from "../_shared/ai-registry.ts";
import { driftFlag } from "../_shared/governance.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function lastWeek(now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  end.setUTCDate(end.getUTCDate() - ((end.getUTCDay() + 6) % 7)); // Monday 00:00 UTC
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 7);
  return { start, end };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const svc = serviceClient();
    const { start, end } = lastWeek();
    const { data: rows, error } = await svc.from("ai_confidence_log")
      .select("function_name, language_of_input, calibrated_confidence, clinician_override, error")
      .gte("created_at", start.toISOString()).lt("created_at", end.toISOString()).limit(10000);
    if (error) throw error;

    const groups = new Map<string, any[]>();
    for (const r of rows ?? []) {
      const lang = r.language_of_input || "unknown";
      for (const key of [`${r.function_name}|${lang}`, `${r.function_name}|all`]) {
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r);
      }
    }

    let flaggedCount = 0;
    for (const [key, list] of groups) {
      const [function_name, language] = key.split("|");
      const confs = list.map((r) => r.calibrated_confidence).filter((v: any) => typeof v === "number");
      const current = {
        avg_confidence: confs.length ? confs.reduce((a: number, b: number) => a + Number(b), 0) / confs.length : null,
        override_rate: list.filter((r) => r.clinician_override).length / list.length,
        error_rate: list.filter((r) => r.error).length / list.length,
      };
      const { data: history } = await svc.from("ai_drift_metrics").select("avg_confidence, override_rate, error_rate")
        .eq("function_name", function_name).eq("language", language).lt("period_start", start.toISOString())
        .order("period_start", { ascending: false }).limit(8);
      const { flagged, reason } = driftFlag(current, (history ?? []).map((h: any) => ({
        avg_confidence: h.avg_confidence === null ? null : Number(h.avg_confidence),
        override_rate: h.override_rate === null ? null : Number(h.override_rate),
        error_rate: h.error_rate === null ? null : Number(h.error_rate),
      })));
      const breakdown: Record<string, number> = {};
      if (language === "all") for (const r of list) breakdown[r.language_of_input || "unknown"] = (breakdown[r.language_of_input || "unknown"] ?? 0) + 1;
      await svc.from("ai_drift_metrics").upsert({
        function_name, language, period_start: start.toISOString(), period_end: end.toISOString(),
        ...current, total_invocations: list.length, language_breakdown: breakdown, flagged, flag_reason: reason,
      }, { onConflict: "function_name,language,period_start" });
      if (flagged) flaggedCount++;
    }
    return json({ period_start: start, period_end: end, groups: groups.size, flagged: flaggedCount });
  } catch (e) {
    console.error("compute-drift-metrics error", e);
    return json({ error: e instanceof Error ? e.message : "Drift computation failed" }, 500);
  }
});
