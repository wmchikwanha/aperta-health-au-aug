/**
 * Research export scaffold — de-identified clinical dataset for evaluation,
 * service quality improvement, and approved research studies.
 *
 * Hard requirements:
 *  - HREC (Human Research Ethics Committee) approval ID is mandatory.
 *  - Participant consent (consents table) must be confirmed for every row.
 *  - No PII leaves the source database: patient identifiers are replaced
 *    with a stable SHA-256 hash salted with the ethics ID.
 *  - Free-text fields are excluded by default; narrative export requires
 *    an explicit `includeFreeText` flag set by the researcher.
 *
 * This module produces the *shape* of an export. The actual fetch happens
 * inside a future edge function that re-checks consent server-side.
 */

export interface ResearchExportConfig {
  /** HREC approval identifier — e.g. "PHN-2026-014" */
  ethicsId: string;
  /** ISO date range, inclusive */
  fromDate: string;
  toDate: string;
  /** Include AI/clinician free-text fields — requires HREC-approved scope */
  includeFreeText?: boolean;
  /** Include screening item-level responses (in addition to totals) */
  includeItemLevel?: boolean;
  /** Optional language filter (BCP-47 codes) */
  languages?: string[];
  /** Optional visa-status filter */
  visaStatuses?: string[];
}

export interface DeidentifiedRow {
  /** SHA-256(patient_id || ":" || ethics_id) — stable within a study, not across studies */
  participant_hash: string;
  encounter_date: string;            // YYYY-MM-DD
  language_code: string | null;
  age_band: string | null;           // e.g. "18-24", "25-44", "45-64", "65+"
  gender: string | null;             // FHIR administrative-gender
  visa_status: string | null;
  aboriginal_torres_strait: boolean | null;
  atsi_label: string | null;         // "Aboriginal" | "Torres Strait Islander" | "Both" | null
  state: string | null;              // AU state code if recorded
  // Screening totals
  phq9_total: number | null;
  phq9_item9: number | null;
  gad7_total: number | null;
  pcl5_total: number | null;
  rhs15_sum: number | null;
  rhs15_thermo: number | null;
  htq4_mean: number | null;
  whodas2_total: number | null;
  gds15_total: number | null;
  psq_endorsed: number | null;
  primer5_total: number | null;
  // Triage / outcomes
  ats_category: 1 | 2 | 3 | 4 | 5 | null;
  primary_dx_code: string | null;
  primary_dx_framework: "ICD-10-AM" | "ICD-11" | "DSM-5-TR" | null;
  treatment_plan_finalised: boolean;
  // Optional free-text (only when includeFreeText=true)
  mse_summary?: string | null;
  cultural_idioms_found?: string[] | null;
}

/**
 * Compute the stable participant hash. Use the Web Crypto API where
 * available (browser, Deno edge function). Returned as a lowercase hex
 * string.
 */
export async function participantHash(patientId: string, ethicsId: string): Promise<string> {
  const data = new TextEncoder().encode(`${patientId}:${ethicsId}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Coerce a date-of-birth into an age band — never export raw DOB. */
export function ageBand(dob: string | Date | null | undefined, referenceDate = new Date()): string | null {
  if (!dob) return null;
  const d = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const yrs = Math.floor((referenceDate.getTime() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  if (yrs < 18) return "<18";
  if (yrs < 25) return "18-24";
  if (yrs < 45) return "25-44";
  if (yrs < 65) return "45-64";
  return "65+";
}

/** Render rows as CSV with a header row. Quotes embedded commas/newlines/quotes. */
export function rowsToCSV(rows: DeidentifiedRow[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]) as (keyof DeidentifiedRow)[];
  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    if (Array.isArray(v)) return esc(v.join("|"));
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map(r => headers.map(h => esc(r[h])).join(",")),
  ];
  return lines.join("\n");
}

/**
 * Validate an export configuration before invoking the edge function.
 * Returns an array of human-readable errors (empty array if valid).
 */
export function validateExportConfig(cfg: Partial<ResearchExportConfig>): string[] {
  const errors: string[] = [];
  if (!cfg.ethicsId || !/^[A-Za-z0-9_\-]{3,}$/.test(cfg.ethicsId)) {
    errors.push("HREC ethics ID is required (alphanumeric, hyphen, underscore — min 3 chars).");
  }
  if (!cfg.fromDate || Number.isNaN(new Date(cfg.fromDate).getTime())) {
    errors.push("fromDate must be a valid ISO date.");
  }
  if (!cfg.toDate || Number.isNaN(new Date(cfg.toDate).getTime())) {
    errors.push("toDate must be a valid ISO date.");
  }
  if (cfg.fromDate && cfg.toDate && new Date(cfg.fromDate) > new Date(cfg.toDate)) {
    errors.push("fromDate must be on or before toDate.");
  }
  return errors;
}

export const RESEARCH_EXPORT_NOTICE =
  "This export contains de-identified data prepared under HREC approval. " +
  "Participant identifiers are SHA-256 hashed with the ethics ID. Free-text " +
  "fields are excluded unless explicitly authorised by the HREC scope. " +
  "Recipients must comply with the Australian Privacy Principles (Privacy Act 1988) " +
  "and the approved research protocol.";
