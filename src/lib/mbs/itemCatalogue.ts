/**
 * MBS Item Catalogue — Mental Health (Better Access initiative)
 *
 * Reference catalogue used by treatment-plan suggestions, referral letters,
 * and clinician-facing tooltips. Rebates reflect the indicative MBS schedule
 * effective from the 1 March 2026 indexation round (latest publicly available
 * at time of authoring — confirm against the live MBS Online schedule before
 * use in billing). No automated rebate lookup is performed.
 *
 * Source: MBS Online (health.gov.au/mbs), Better Access initiative.
 */

export type MBSProvider =
  | "GP"
  | "Psychiatrist"
  | "Clinical Psychologist"
  | "Other Psychologist"
  | "Eligible Allied Mental Health"
  | "Eligible Aboriginal & Torres Strait Islander Health Worker";

export interface MBSItem {
  itemNumber: string;
  shortName: string;
  description: string;
  provider: MBSProvider;
  /** Indicative Medicare rebate in AUD — confirm against MBS Online before billing */
  rebateAUD: number;
  /** Whether telehealth (video/phone) variant exists for this item family */
  telehealthAvailable: boolean;
  /** Key eligibility / claiming notes */
  notes: string;
}

export const MBS_MENTAL_HEALTH_ITEMS: MBSItem[] = [
  // ---------- GP Mental Health Treatment Plan ----------
  {
    itemNumber: "2715",
    shortName: "GP MHTP — preparation (≥ 20 min)",
    description: "Preparation of a GP Mental Health Treatment Plan (lasting at least 20 minutes).",
    provider: "GP",
    rebateAUD: 113.30,
    telehealthAvailable: true,
    notes: "Requires completion of MH skills training. Use 2717 if ≥ 40 min and clinically indicated.",
  },
  {
    itemNumber: "2717",
    shortName: "GP MHTP — preparation (≥ 40 min)",
    description: "Preparation of a GP Mental Health Treatment Plan (lasting at least 40 minutes).",
    provider: "GP",
    rebateAUD: 166.95,
    telehealthAvailable: true,
    notes: "Recommended for complex CALD/refugee presentations with interpreter use.",
  },
  {
    itemNumber: "2712",
    shortName: "GP MHTP — review",
    description: "Review of a GP Mental Health Treatment Plan.",
    provider: "GP",
    rebateAUD: 84.45,
    telehealthAvailable: true,
    notes: "Minimum interval between MHTP preparation and review: 4 weeks.",
  },
  {
    itemNumber: "2713",
    shortName: "GP mental health consultation (≥ 20 min)",
    description: "GP focussed psychological strategies / mental health consultation (≥ 20 min).",
    provider: "GP",
    rebateAUD: 84.45,
    telehealthAvailable: true,
    notes: "Used for ongoing GP mental-health support outside MHTP preparation/review.",
  },
  // ---------- GP general MBS (used alongside MH items) ----------
  { itemNumber: "23",  shortName: "GP consultation — Level B",  description: "Standard GP consultation < 20 min.",  provider: "GP", rebateAUD: 42.85, telehealthAvailable: true, notes: "" },
  { itemNumber: "36",  shortName: "GP consultation — Level C",  description: "GP consultation ≥ 20 min.",            provider: "GP", rebateAUD: 82.90, telehealthAvailable: true, notes: "" },
  { itemNumber: "44",  shortName: "GP consultation — Level D",  description: "GP consultation ≥ 40 min.",            provider: "GP", rebateAUD: 122.15, telehealthAvailable: true, notes: "" },
  // ---------- Chronic Disease / Care Plans (often used with refugee health) ----------
  { itemNumber: "721", shortName: "GP Management Plan",         description: "Preparation of a GP Management Plan.", provider: "GP", rebateAUD: 164.35, telehealthAvailable: false, notes: "Useful where comorbid chronic disease alongside mental health." },
  { itemNumber: "723", shortName: "Team Care Arrangements",     description: "Coordination of Team Care Arrangements.", provider: "GP", rebateAUD: 130.25, telehealthAvailable: false, notes: "Enables up to 5 allied-health visits per calendar year under items 10950–10970." },
  { itemNumber: "732", shortName: "Review of GPMP/TCAs",        description: "Review of GP Management Plan or TCAs.", provider: "GP", rebateAUD: 82.10, telehealthAvailable: false, notes: "" },
  // ---------- Better Access — Psychological Services ----------
  {
    itemNumber: "80000",
    shortName: "Clinical Psychologist — focussed psychological strategies (≥ 50 min, in rooms)",
    description: "Clinical Psychologist treatment session, ≥ 50 min, face-to-face in consulting rooms.",
    provider: "Clinical Psychologist",
    rebateAUD: 141.85,
    telehealthAvailable: true,
    notes: "Up to 10 sessions per calendar year under Better Access.",
  },
  {
    itemNumber: "80010",
    shortName: "Clinical Psychologist — telehealth video (≥ 50 min)",
    description: "Clinical Psychologist treatment session, ≥ 50 min, via video.",
    provider: "Clinical Psychologist",
    rebateAUD: 141.85,
    telehealthAvailable: true,
    notes: "Telehealth equivalent of 80000.",
  },
  {
    itemNumber: "80020",
    shortName: "Clinical Psychologist — telephone (≥ 30 min)",
    description: "Clinical Psychologist treatment session by phone, ≥ 30 min.",
    provider: "Clinical Psychologist",
    rebateAUD: 96.65,
    telehealthAvailable: true,
    notes: "Use where video not feasible (low bandwidth, interpreter constraints).",
  },
  {
    itemNumber: "80100",
    shortName: "Registered Psychologist — focussed psychological strategies (≥ 50 min, in rooms)",
    description: "Registered Psychologist treatment session, ≥ 50 min, face-to-face in consulting rooms.",
    provider: "Other Psychologist",
    rebateAUD: 96.65,
    telehealthAvailable: true,
    notes: "Up to 10 sessions per calendar year under Better Access.",
  },
  {
    itemNumber: "80125",
    shortName: "Accredited Mental Health Social Worker / OT — session (in rooms)",
    description: "Eligible Allied Mental Health Worker (AMHSW or OT) treatment session, ≥ 50 min.",
    provider: "Eligible Allied Mental Health",
    rebateAUD: 85.20,
    telehealthAvailable: true,
    notes: "AMHSWs are well-suited to interpreter-mediated refugee therapy.",
  },
  // ---------- Psychiatrist ----------
  { itemNumber: "291", shortName: "Psychiatrist — initial assessment",     description: "Initial new-patient psychiatric assessment and management plan to referring practitioner.", provider: "Psychiatrist", rebateAUD: 484.65, telehealthAvailable: true, notes: "Single-occasion item. Triggers Item 293 review." },
  { itemNumber: "293", shortName: "Psychiatrist — review of 291 plan",     description: "Psychiatrist review of management plan prepared under 291.", provider: "Psychiatrist", rebateAUD: 269.95, telehealthAvailable: true, notes: "" },
  { itemNumber: "296", shortName: "Psychiatrist — consultation (≥ 45 min)",description: "Psychiatrist consultation ≥ 45 min.", provider: "Psychiatrist", rebateAUD: 312.85, telehealthAvailable: true, notes: "" },
  { itemNumber: "297", shortName: "Psychiatrist — consultation (≥ 75 min)",description: "Psychiatrist consultation ≥ 75 min.", provider: "Psychiatrist", rebateAUD: 421.50, telehealthAvailable: true, notes: "" },
  { itemNumber: "300", shortName: "Psychiatrist — consultation (< 15 min)", description: "Psychiatrist short consultation < 15 min.", provider: "Psychiatrist", rebateAUD: 64.55, telehealthAvailable: true, notes: "" },
  // ---------- Aboriginal & Torres Strait Islander ----------
  { itemNumber: "715", shortName: "Aboriginal & Torres Strait Islander Health Assessment",
    description: "Health assessment for Aboriginal and Torres Strait Islander people (any age).",
    provider: "GP", rebateAUD: 245.65, telehealthAvailable: false,
    notes: "Annual claim. Triggers follow-up items 10987 (RN) and allied-health items 81300–81360." },
];

/** Find item by MBS number */
export function getMBSItem(itemNumber: string): MBSItem | undefined {
  return MBS_MENTAL_HEALTH_ITEMS.find(i => i.itemNumber === itemNumber);
}

/** Filter catalogue by provider */
export function getMBSItemsByProvider(provider: MBSProvider): MBSItem[] {
  return MBS_MENTAL_HEALTH_ITEMS.filter(i => i.provider === provider);
}

/** Recommended starter items for a CALD/refugee MHTP workflow */
export const RECOMMENDED_REFUGEE_MHTP_BUNDLE = [
  "2717", // GP MHTP — preparation ≥ 40 min (allows for interpreter)
  "2712", // GP MHTP — review
  "80000", // Clinical psychologist session
  "80125", // Accredited Mental Health Social Worker session
  "715",  // ATSI health assessment (when applicable)
];
