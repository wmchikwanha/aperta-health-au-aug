// Batch 5 — AI provenance tagging for FHIR resources and PDF exports.
export const AI_PROVENANCE_SYSTEM = "https://aperta.health/ai-provenance";
export const AI_DRAFT_DISPLAY = "AI-generated suggestion requiring clinical review";

export interface AIProvenance {
  model_id?: string | null;
  model_version?: string | null;
  prompt_template_version?: string | null;
  generation_timestamp?: string | null;
}
export interface ClinicianApproval { approver: string; approved_at: string }

/** Adds the AI-draft tag + provenance extensions; adds clinician-approved alongside (never replacing) the draft tag. */
export function applyAIProvenance<T extends Record<string, any>>(resource: T, prov: AIProvenance, approval?: ClinicianApproval | null): T {
  const meta = { ...(resource.meta ?? {}) };
  const tags = [...(meta.tag ?? [])].filter((t: any) => t.system !== AI_PROVENANCE_SYSTEM);
  tags.push({ system: AI_PROVENANCE_SYSTEM, code: "ai-generated-draft", display: AI_DRAFT_DISPLAY });
  if (approval) tags.push({ system: AI_PROVENANCE_SYSTEM, code: "clinician-approved", display: `Clinician-approved by ${approval.approver} at ${approval.approved_at}` });
  const ext = [...(meta.extension ?? [])].filter((e: any) => !String(e.url).startsWith(AI_PROVENANCE_SYSTEM));
  const add = (k: string, v?: string | null) => v && ext.push({ url: `${AI_PROVENANCE_SYSTEM}/${k}`, valueString: v });
  add("model_id", prov.model_id);
  add("model_version", prov.model_version);
  add("prompt_template_version", prov.prompt_template_version);
  add("generation_timestamp", prov.generation_timestamp ?? new Date().toISOString());
  if (approval) { add("approver", approval.approver); add("approved_at", approval.approved_at); }
  return { ...resource, meta: { ...meta, tag: tags, extension: ext } };
}

/** One-line provenance footer for PDFs. */
export function provenanceFooter(prov?: AIProvenance | null, approval?: ClinicianApproval | null): string {
  const parts = [AI_DRAFT_DISPLAY];
  if (prov?.model_id) parts.push(`Model ${prov.model_id}${prov.model_version ? ` (${prov.model_version})` : ""}`);
  if (prov?.prompt_template_version) parts.push(`Prompt v${prov.prompt_template_version}`);
  if (prov?.generation_timestamp) parts.push(`Generated ${prov.generation_timestamp}`);
  if (approval) parts.push(`Approved by ${approval.approver} ${approval.approved_at}`);
  else parts.push("Full model/prompt provenance recorded in the audit log");
  return parts.join(" · ");
}

/** Decision for concordance: accepted when the clinician kept the AI primary code unchanged. */
export function reviewDecision(aiCode: string | null | undefined, finalCode: string | null | undefined, rejected = false): "accepted" | "modified" | "rejected" {
  if (rejected || !finalCode) return "rejected";
  return (aiCode ?? "").trim().toUpperCase() === finalCode.trim().toUpperCase() ? "accepted" : "modified";
}

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
