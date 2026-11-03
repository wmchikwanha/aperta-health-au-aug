// Uptime probe: database, storage, AI gateway. Returns { status, checks, timestamp }. No patient data touched.
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Check = { ok: boolean; latency_ms: number; detail?: string };

async function timed(fn: () => Promise<string | void>): Promise<Check> {
  const t = Date.now();
  try {
    const detail = await Promise.race([
      fn(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
    ]);
    return { ok: true, latency_ms: Date.now() - t, ...(detail ? { detail } : {}) };
  } catch (e) {
    return { ok: false, latency_ms: Date.now() - t, detail: e instanceof Error ? e.message : "failed" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const [database, storage, ai_gateway] = await Promise.all([
    timed(async () => {
      const { error } = await svc.from("pilot_config").select("id").limit(1);
      if (error) throw new Error("query failed");
    }),
    timed(async () => {
      const { error } = await svc.storage.listBuckets();
      if (error) throw new Error("storage unavailable");
    }),
    timed(async () => {
      const key = Deno.env.get("LOVABLE_API_KEY");
      if (!key) throw new Error("not configured");
      const r = await fetch("https://ai.gateway.lovable.dev/v1/models", { headers: { Authorization: `Bearer ${key}` } });
      await r.text();
      if (r.status >= 500) throw new Error(`gateway ${r.status}`);
    }),
  ]);
  // Translation runs through the same AI gateway (transcribe-audio), so its availability mirrors it.
  const translation: Check = { ...ai_gateway };
  const checks = { database, storage, ai_gateway, translation };
  const status = !database.ok ? "down" : Object.values(checks).every((c) => c.ok) ? "healthy" : "degraded";

  if (!database.ok) {
    console.error("health-check: database unreachable");
  } else if (status !== "healthy") {
    const failing = Object.entries(checks).filter(([, c]) => !c.ok).map(([k]) => k);
    const hour = new Date().toISOString().slice(0, 13);
    await svc.from("system_alerts").upsert({
      alert_type: "service_degraded", severity: "warning", source_function: "health-check",
      message: `Health check degraded: ${failing.join(", ")} unavailable.`,
      metadata: { checks }, dedupe_key: `health:${failing.join(",")}:${hour}`,
    }, { onConflict: "dedupe_key", ignoreDuplicates: true });
  }

  return new Response(JSON.stringify({ status, checks, timestamp: new Date().toISOString() }), {
    status: status === "down" ? 503 : 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
