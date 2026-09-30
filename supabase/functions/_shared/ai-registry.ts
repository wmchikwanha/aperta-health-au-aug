// Aperta AI model lifecycle registry loader (Batch 2).
// Every clinical AI call reads its active model, prompt template and safety preamble
// from the database. If any piece is missing or the preamble hash does not match,
// the call is refused — nothing is hardcoded.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

export type AIFunctionName =
  | "process-narrative" | "transcribe-audio" | "process-document"
  | "suggest-diagnosis" | "generate-treatment-plan" | "ask-ai" | "self-assess";

export interface AIConfig {
  model: string;
  systemPrompt: string;
  provenance: {
    model_id: string;
    model_version: string;
    model_version_id: string;
    prompt_template_id: string;
    prompt_template_version: string;
    safety_preamble_version: string;
    safety_preamble_hash: string;
  };
}

export class AIConfigError extends Error {
  status = 503;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
}

/** Pure composition step, exported for tests. */
export function composeConfig(
  functionName: string,
  prompt: { id: string; version: string; model_slot: string; system_prompt: string; safety_preamble_hash: string } | null,
  preamble: { version: string; preamble_text: string; preamble_hash: string } | null,
  model: { id: string; model_id: string; model_version_label: string } | null,
  computedPreambleHash: string | null,
): AIConfig {
  if (!prompt) throw new AIConfigError(`No active prompt template configured for ${functionName}. AI call refused.`);
  if (!preamble) throw new AIConfigError("No current safety preamble configured. AI call refused.");
  if (!model) throw new AIConfigError(`No active model version configured for slot "${prompt.model_slot}". AI call refused.`);
  if (computedPreambleHash !== preamble.preamble_hash || prompt.safety_preamble_hash !== preamble.preamble_hash) {
    throw new AIConfigError(`Safety preamble hash mismatch for ${functionName}. AI call refused.`);
  }
  return {
    model: model.model_id,
    systemPrompt: `${preamble.preamble_text}\n\n${prompt.system_prompt}`,
    provenance: {
      model_id: model.model_id,
      model_version: model.model_version_label,
      model_version_id: model.id,
      prompt_template_id: prompt.id,
      prompt_template_version: prompt.version,
      safety_preamble_version: preamble.version,
      safety_preamble_hash: preamble.preamble_hash,
    },
  };
}

export async function loadAIConfig(functionName: AIFunctionName): Promise<AIConfig> {
  const svc = serviceClient();
  const [{ data: prompt }, { data: preamble }] = await Promise.all([
    svc.from("prompt_templates").select("id, version, model_slot, system_prompt, safety_preamble_hash")
      .eq("function_name", functionName).eq("status", "active").maybeSingle(),
    svc.from("ai_safety_preambles").select("version, preamble_text, preamble_hash").eq("is_current", true).maybeSingle(),
  ]);
  let model = null;
  if (prompt) {
    const { data } = await svc.from("model_versions").select("id, model_id, model_version_label")
      .eq("slot", prompt.model_slot).eq("status", "active").maybeSingle();
    model = data;
  }
  const computed = preamble ? await sha256Hex(preamble.preamble_text) : null;
  return composeConfig(functionName, prompt, preamble, model, computed);
}

/** Record confidence for a clinical AI output (non-fatal). */
export async function logConfidence(entry: {
  function_name: AIFunctionName; clinician_id: string; raw_confidence: number | null;
  patient_id?: string | null; language_of_input?: string | null; provenance: AIConfig["provenance"]; error?: boolean;
}) {
  try {
    const raw = typeof entry.raw_confidence === "number" && isFinite(entry.raw_confidence)
      ? Math.max(0, Math.min(1, entry.raw_confidence > 1 ? entry.raw_confidence / 100 : entry.raw_confidence)) : null;
    await serviceClient().from("ai_confidence_log").insert({
      function_name: entry.function_name,
      clinician_id: entry.clinician_id,
      patient_id: entry.patient_id ?? null,
      raw_confidence: raw,
      // Conservative calibration until validation data exists: shrink toward 0.5.
      calibrated_confidence: raw === null ? null : Number((0.5 + (raw - 0.5) * 0.8).toFixed(3)),
      language_of_input: entry.language_of_input ?? "unknown",
      model_version_id: entry.provenance.model_version_id,
      prompt_template_id: entry.provenance.prompt_template_id,
      error: entry.error ?? false,
    });
  } catch (e) {
    console.error("confidence log failed", e);
  }
}

export function confidenceBand(value: number | null | undefined): "High" | "Medium" | "Low" | "Unknown" {
  if (typeof value !== "number" || !isFinite(value)) return "Unknown";
  if (value > 0.8) return "High";
  if (value >= 0.5) return "Medium";
  return "Low";
}
