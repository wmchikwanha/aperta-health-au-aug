// Output validation, fail-safe and safety logging (Batch 3).
import { containsMedicationDosage } from "./clinical-rules.ts";
import { serviceClient } from "./ai-registry.ts";

export const FAIL_SAFE_MESSAGE = "AI suggestion unavailable, clinical review required";

export type SchemaSpec = Record<string, "string" | "array" | "object" | "number" | "any">;

export const SCHEMAS: Record<string, SchemaSpec> = {
  "process-narrative": { review_notice: "string", language_detected: "string", extracted_entities: "object" },
  "suggest-diagnosis": { primaryDiagnosis: "object", differentialDiagnoses: "array" },
  "generate-treatment-plan": { primary_interventions: "array", monitoring_plan: "object", referral_criteria: "array" },
  "transcribe-audio": { text: "string" },
};

export function validateShape(value: unknown, spec: SchemaSpec): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "output is not a JSON object";
  for (const [key, type] of Object.entries(spec)) {
    const v = (value as Record<string, unknown>)[key];
    if (v === undefined || v === null) return `missing ${key}`;
    if (type === "array" && !Array.isArray(v)) return `${key} must be an array`;
    if (type === "object" && (typeof v !== "object" || Array.isArray(v))) return `${key} must be an object`;
    if (type === "string" && typeof v !== "string") return `${key} must be a string`;
    if (type === "number" && typeof v !== "number") return `${key} must be a number`;
  }
  return null;
}

export function parseJson(content: unknown): unknown {
  if (content && typeof content === "object") return content;
  if (typeof content !== "string") return null;
  try { return JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, "").trim()); } catch { return null; }
}

export interface ValidationOutcome<T> {
  ok: boolean;
  value?: T;
  attempts: number;
  reason?: string;
  dosageBlocked: boolean;
  gatewayStatus?: number;
}

/**
 * Calls the model up to twice. Output must parse, match the schema and contain no dosage.
 * Gateway 402/403/429 are terminal (no retry) and surfaced to the caller.
 */
export async function callWithValidation<T>(
  call: () => Promise<Response>,
  spec: SchemaSpec,
  extract: (data: any) => unknown = (d) => d?.choices?.[0]?.message?.content,
  pick: (parsed: any) => any = (p) => p,
): Promise<ValidationOutcome<T>> {
  let reason = "";
  let dosageBlocked = false;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const r = await call();
    if (!r.ok) {
      await r.text();
      if ([402, 403, 429].includes(r.status)) return { ok: false, attempts: attempt, reason: `gateway ${r.status}`, dosageBlocked, gatewayStatus: r.status };
      reason = `gateway ${r.status}`;
      continue;
    }
    const parsed = parseJson(extract(await r.json()));
    const value = pick(parsed);
    const shapeError = validateShape(value, spec);
    if (shapeError) { reason = shapeError; continue; }
    if (containsMedicationDosage(value)) { dosageBlocked = true; reason = "medication dosage detected"; continue; }
    return { ok: true, value: value as T, attempts: attempt, dosageBlocked };
  }
  return { ok: false, attempts: 2, reason, dosageBlocked };
}

export async function logInference(e: {
  function_name: string; actor_id?: string | null; model_id?: string; prompt_template_id?: string;
  schema_valid: boolean; attempts?: number; injection_patterns?: string[]; dosage_blocked?: boolean;
  cultural_flags?: unknown[]; failure_reason?: string | null; input_chars?: number;
  pii?: { count: number; types: string[] };
}) {
  const svc = serviceClient();
  try {
    await svc.from("ai_inference_events").insert({
      function_name: e.function_name, actor_id: e.actor_id ?? null, model_id: e.model_id ?? null,
      prompt_template_id: e.prompt_template_id ?? null, schema_valid: e.schema_valid, attempts: e.attempts ?? 1,
      injection_detected: (e.injection_patterns?.length ?? 0) > 0, injection_patterns: e.injection_patterns ?? [],
      dosage_blocked: e.dosage_blocked ?? false, cultural_flags: e.cultural_flags ?? [],
      failure_reason: e.failure_reason ?? null, input_chars: e.input_chars ?? null,
      pii_spans_detected: e.pii?.count ?? 0, pii_types: e.pii?.types ?? [],
    });
    if (e.injection_patterns?.length && e.actor_id) {
      await svc.from("audit_events").insert({
        actor_id: e.actor_id, actor_role: "system", action: "injection_pattern_detected", outcome: "flagged",
        resource_type: "ai_input", description: `Injection patterns neutralised in ${e.function_name}`,
        metadata: { patterns: e.injection_patterns }, source: e.function_name,
      });
    }
    const incidents: Array<Record<string, unknown>> = [];
    if (!e.schema_valid) incidents.push({ incident_type: e.dosage_blocked ? "unsafe_content" : "output_validation_failure", severity: e.dosage_blocked ? "high" : "medium", description: `Automatic: ${e.function_name} output failed validation (${e.failure_reason ?? "unknown"}). Fail-safe shown.` });
    if (e.injection_patterns?.length) incidents.push({ incident_type: "injection_attempt", severity: "medium", description: `Automatic: instruction-injection text neutralised in ${e.function_name} (${e.injection_patterns.join(", ")}).` });
    if (incidents.length) {
      await svc.from("ai_incidents").insert(incidents.map((i) => ({ ...i, source: "system", reported_by: null, function_name: e.function_name, metadata: { model_id: e.model_id ?? null } })));
    }
  } catch (err) {
    console.error("logInference failed", err);
  }
}

/** Cultural safety: find do-not-pathologise idioms the output relies on. */
export interface IdiomRow { id: string; idiom: string; match_terms: string[]; guidance: string | null }

export function findCulturalFlags(sourceText: string, outputText: string, idioms: IdiomRow[]) {
  const src = sourceText.toLowerCase();
  const out = outputText.toLowerCase();
  return idioms
    .filter((i) => i.match_terms.some((t) => t && (src.includes(t.toLowerCase()) || out.includes(t.toLowerCase()))))
    .map((i) => ({ idiom_id: i.id, idiom: i.idiom, guidance: i.guidance, message: "Cultural review required: suggestion may pathologise a culturally normative expression." }));
}

export async function loadDoNotPathologise(): Promise<IdiomRow[]> {
  const { data } = await serviceClient().from("cultural_idioms").select("id, idiom, match_terms, guidance").eq("do_not_pathologise", true);
  return (data ?? []) as IdiomRow[];
}
