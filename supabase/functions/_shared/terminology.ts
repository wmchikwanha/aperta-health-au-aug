// Terminology resolution: AI proposes codes, the curated snomed_mappings table decides.
// Pure helpers (resolveCandidate) are exported for tests.
export const ICD10AM_EDITION = "ICD-10-AM 12th Edition (2024)";
export const SNOMED_EDITION = "SNOMED CT-AU August 2026";
export const DSM_VERSION = "DSM-5-TR";

export interface SnomedRow {
  snomed_concept_id: string; snomed_fsn: string; snomed_preferred_term: string;
  icd10am_code: string | null; icd11_code: string | null; dsm5tr_code: string | null;
  cultural_idiom_links: string[]; severity_qualifier: string; diagnostic_category: string;
}

const norm = (c?: string | null) => (c ?? "").toUpperCase().replace(/\s/g, "");

/** Valid ICD-10-AM shape (letter + 2 digits + optional .1-4 chars). */
export function isIcd10amShape(code: string): boolean {
  return /^[A-Z]\d{2}(\.[0-9A-Z]{1,4})?$/.test(norm(code));
}

export function resolveCandidate(cand: any, rows: SnomedRow[], narrative = "") {
  const codes = [cand?.icd10am_code, cand?.code, cand?.icd11_code, cand?.dsm5tr_code].map(norm).filter(Boolean);
  const sev = String(cand?.severity ?? cand?.name ?? "").toLowerCase();
  let hits = rows.filter((r) => codes.includes(norm(r.icd10am_code)));
  if (!hits.length) hits = rows.filter((r) => codes.includes(norm(r.icd11_code)) || codes.includes(norm(r.dsm5tr_code)));
  // Loose match on 3-char ICD-10 category (e.g. F32.x -> F32.9)
  if (!hits.length) {
    const cats = codes.map((c) => c.slice(0, 3));
    hits = rows.filter((r) => r.icd10am_code && cats.includes(norm(r.icd10am_code).slice(0, 3)));
  }
  const pick = hits.find((r) => r.severity_qualifier !== "unspecified" && sev.includes(r.severity_qualifier))
    ?? hits.find((r) => r.severity_qualifier === "unspecified") ?? hits[0];
  if (!pick) {
    return { ...cand, snomedConceptId: null, snomedFSN: null, snomedPreferredTerm: null, icd10amCode: null,
      icd11Code: cand?.icd11_code ?? null, dsm5trCode: cand?.dsm5tr_code ?? null, culturalIdiomMatch: null,
      terminologyStatus: "unmapped" };
  }
  const lower = narrative.toLowerCase();
  const idiom = pick.cultural_idiom_links.find((i) => lower.includes(i.toLowerCase())) ?? null;
  return { ...cand, snomedConceptId: pick.snomed_concept_id, snomedFSN: pick.snomed_fsn,
    snomedPreferredTerm: pick.snomed_preferred_term, icd10amCode: pick.icd10am_code, icd11Code: pick.icd11_code,
    dsm5trCode: pick.dsm5tr_code, culturalIdiomMatch: idiom, terminologyStatus: "resolved" };
}
