// Public endpoint hardening (Batch 3): hashed-IP rate limits, uniform errors, anomaly logging.
import { serviceClient, sha256Hex } from "./ai-registry.ts";

export const UNIFORM_NOT_FOUND = "This link or code is invalid, expired or already used.";

export async function clientIpHash(req: Request): Promise<string> {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
  return await sha256Hex(`${ip}::aperta-rl-v1`);
}

/** Returns true if allowed. Fails open only if the limiter itself errors (logged). */
export async function rateLimit(bucket: string, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await serviceClient().rpc("check_rate_limit", { _bucket: bucket, _key_hash: key, _limit: limit, _window_seconds: windowSeconds });
  if (error) { console.error("rate limiter error", error); return true; }
  return data === true;
}

export async function logAnomaly(source: string, kind: string, ipHash: string, extra: Record<string, unknown> = {}) {
  console.warn("public anomaly", source, kind);
  try {
    await serviceClient().from("ai_inference_events").insert({
      function_name: source, schema_valid: true, failure_reason: `anomaly:${kind}`,
      injection_patterns: [], cultural_flags: [{ ip_hash: ipHash.slice(0, 16), ...extra }],
    });
  } catch { /* non-fatal */ }
}
