/**
 * Aperta Health — Refugee & CALD Screening Battery (Australian context)
 *
 * Adds refugee-validated tools alongside the standard scoringUtils.ts set:
 *   - RHS-15         Refugee Health Screener-15 (Hollifield et al., 2013)
 *   - HTQ-IV         Harvard Trauma Questionnaire Part IV (Mollica et al.)
 *   - WHODAS 2.0     WHO Disability Assessment Schedule, 12-item self-report
 *   - GDS-15         Geriatric Depression Scale, short form (Yesavage)
 *   - PHQ-9-R note   Refugee adaptation cutoff guidance
 *
 * All output is structured for use by Refugee Health Nurses and clinicians,
 * and is mandatory-review (AI suggests, clinician decides).
 *
 * Triage outputs map to the Australasian Triage Scale (ATS 1–5).
 */

import type { ScoringResult } from "./scoringUtils";

// ============================================================================
// RHS-15 — Refugee Health Screener
// ============================================================================
// Items 1–14: 0–4 Likert (Not at all → Extremely)
// Item 15: Distress thermometer 0–10
// Positive screen if (sum of items 1–14 ≥ 12) OR (item 15 ≥ 5)
// ============================================================================

export interface RHS15Input {
  /** 14 Likert items, each 0–4 */
  items: number[]; // length 14
  /** Distress thermometer 0–10 */
  distressThermometer: number;
}

export const scoreRHS15 = (input: RHS15Input): ScoringResult => {
  const sum = input.items.slice(0, 14).reduce((s, v) => s + (v || 0), 0);
  const thermo = input.distressThermometer ?? 0;
  const positive = sum >= 12 || thermo >= 5;
  const alerts: string[] = [];

  let severityLevel: string;
  let interpretation: string;

  if (!positive) {
    severityLevel = "Negative Screen";
    interpretation =
      "Below threshold for emotional distress. Continue routine refugee health monitoring.";
  } else if (sum >= 24 || thermo >= 8) {
    severityLevel = "High Distress";
    interpretation =
      "High emotional distress. Refer to specialist refugee mental-health service (e.g. STARTTS, Foundation House, Companion House). Consider torture/trauma history exploration with trained clinician.";
    alerts.push("RHS-15 high distress — prioritise specialist refugee mental-health referral.");
  } else {
    severityLevel = "Positive Screen";
    interpretation =
      "Positive screen for emotional distress. Recommend follow-up assessment within 2 weeks by Refugee Health Nurse or GP under Mental Health Treatment Plan.";
  }

  return {
    totalScore: sum,
    severityLevel,
    interpretation,
    alerts: alerts.length ? alerts : undefined,
  };
};

// ============================================================================
// HTQ Part IV — Trauma Symptom score (16 items, 1–4)
// Average ≥ 2.5 suggests probable PTSD per Mollica.
// ============================================================================

export const scoreHTQ4 = (responses: number[]): ScoringResult => {
  const valid = responses.filter(r => typeof r === "number" && r > 0);
  if (valid.length === 0) {
    return {
      totalScore: 0,
      severityLevel: "Incomplete",
      interpretation: "Insufficient responses to score.",
    };
  }
  const mean = valid.reduce((s, v) => s + v, 0) / valid.length;
  const score = Number(mean.toFixed(2));
  const alerts: string[] = [];

  let severityLevel: string;
  let interpretation: string;

  if (mean >= 2.5) {
    severityLevel = "Probable PTSD";
    interpretation =
      "HTQ-IV mean ≥ 2.5 — probable PTSD. Refer for trauma-focused psychological intervention (e.g. STARTTS/Foundation House). Avoid re-traumatising detailed trauma history at first contact.";
    alerts.push("HTQ-IV probable PTSD threshold reached.");
  } else if (mean >= 2.0) {
    severityLevel = "Elevated Trauma Symptoms";
    interpretation =
      "Elevated trauma symptoms below diagnostic threshold. Routine refugee trauma pathway recommended.";
  } else {
    severityLevel = "Low";
    interpretation = "Low trauma symptom burden on HTQ-IV.";
  }

  return { totalScore: score, severityLevel, interpretation, alerts: alerts.length ? alerts : undefined };
};

// ============================================================================
// WHODAS 2.0 — 12-item self-report
// Simple sum scoring (0–48). Higher = more disability.
// ============================================================================

export const scoreWHODAS2 = (responses: number[]): ScoringResult => {
  const total = responses.reduce((s, v) => s + (v || 0), 0);
  let severityLevel: string;
  let interpretation: string;

  if (total <= 12) {
    severityLevel = "No / Mild Disability";
    interpretation = "Minimal functional impairment across domains.";
  } else if (total <= 24) {
    severityLevel = "Moderate Disability";
    interpretation =
      "Moderate functional impairment. Consider allied-health referral (psychology, OT) and MBS care plan.";
  } else if (total <= 36) {
    severityLevel = "Severe Disability";
    interpretation =
      "Severe functional impairment. Multidisciplinary care plan recommended; consider NDIS access pathway if eligible.";
  } else {
    severityLevel = "Complete Disability";
    interpretation =
      "Very severe functional impairment. Urgent multidisciplinary review and disability support assessment.";
  }
  return { totalScore: total, severityLevel, interpretation };
};

// ============================================================================
// GDS-15 — Geriatric Depression Scale, short form
// ≥5 suggests depression; ≥10 suggests severe depression.
// ============================================================================

export const scoreGDS15 = (responses: number[]): ScoringResult => {
  const total = responses.reduce((s, v) => s + (v ? 1 : 0), 0);
  const alerts: string[] = [];
  let severityLevel: string;
  let interpretation: string;

  if (total >= 10) {
    severityLevel = "Severe Depression";
    interpretation =
      "GDS-15 ≥ 10 — severe depression in older adult. Comprehensive geriatric psychiatric assessment recommended.";
    alerts.push("Severe late-life depression — assess suicide risk and cognitive contributors.");
  } else if (total >= 5) {
    severityLevel = "Probable Depression";
    interpretation =
      "GDS-15 ≥ 5 — probable depression. Recommend follow-up assessment and MBS Mental Health Treatment Plan.";
  } else {
    severityLevel = "Normal";
    interpretation = "Below threshold for depression on GDS-15.";
  }
  return { totalScore: total, severityLevel, interpretation, alerts: alerts.length ? alerts : undefined };
};

// ============================================================================
// PHQ-9 — Refugee adaptation guidance
// Standard PHQ-9 cutoff = 10. Some refugee validation studies (e.g. Bhutanese,
// Karen, Somali cohorts) suggest a cutoff of 8 to improve sensitivity.
// Use this helper to annotate an existing PHQ-9 score.
// ============================================================================

export function phq9RefugeeNote(totalScore: number): string | null {
  if (totalScore >= 8 && totalScore < 10) {
    return "Refugee adaptation: cutoff of ≥ 8 reaches probable-depression threshold in several refugee validation studies. Consider clinical follow-up even though below standard PHQ-9 cutoff of 10.";
  }
  return null;
}

// ============================================================================
// Australasian Triage Scale (ATS 1–5)
// ============================================================================

export type ATSCategory = 1 | 2 | 3 | 4 | 5;

export interface ATSResult {
  category: ATSCategory;
  label: string;
  maxWaitMinutes: number;
  description: string;
}

const ATS_CATEGORIES: Record<ATSCategory, Omit<ATSResult, "category">> = {
  1: { label: "Immediately life-threatening",  maxWaitMinutes: 0,   description: "Resuscitation — immediate assessment and treatment. Active suicidal behaviour, severe self-harm, acute psychosis with imminent danger." },
  2: { label: "Imminently life-threatening",   maxWaitMinutes: 10,  description: "Emergency — assessment within 10 minutes. Acute suicidal ideation with plan, severe behavioural disturbance." },
  3: { label: "Potentially life-threatening",  maxWaitMinutes: 30,  description: "Urgent — assessment within 30 minutes. Moderate suicidal ideation without plan, acute psychosis stabilised, severe distress." },
  4: { label: "Potentially serious",           maxWaitMinutes: 60,  description: "Semi-urgent — assessment within 60 minutes. Mild–moderate symptoms with safety risk uncertain, escalating distress." },
  5: { label: "Less urgent",                   maxWaitMinutes: 120, description: "Non-urgent — assessment within 120 minutes. Routine refugee mental-health follow-up, stable presentation." },
};

/**
 * Derive an ATS category from screening signals. Conservative — defaults to
 * higher acuity when in doubt. Clinician override is required for final triage.
 */
export function deriveATS(signals: {
  phq9Item9?: number;
  psqEndorsed?: number;
  rhs15Sum?: number;
  rhs15Thermo?: number;
  htq4Mean?: number;
  activeSuicidePlan?: boolean;
  recentSelfHarm?: boolean;
}): ATSResult {
  let cat: ATSCategory = 5;

  if (signals.activeSuicidePlan || signals.recentSelfHarm) cat = 1;
  else if ((signals.phq9Item9 ?? 0) >= 2 || (signals.psqEndorsed ?? 0) >= 3) cat = 2;
  else if ((signals.phq9Item9 ?? 0) >= 1 || (signals.psqEndorsed ?? 0) >= 1) cat = 3;
  else if ((signals.rhs15Sum ?? 0) >= 24 || (signals.rhs15Thermo ?? 0) >= 8 || (signals.htq4Mean ?? 0) >= 2.5) cat = 3;
  else if ((signals.rhs15Sum ?? 0) >= 12 || (signals.rhs15Thermo ?? 0) >= 5 || (signals.htq4Mean ?? 0) >= 2.0) cat = 4;

  return { category: cat, ...ATS_CATEGORIES[cat] };
}

export function getATSCategory(cat: ATSCategory): ATSResult {
  return { category: cat, ...ATS_CATEGORIES[cat] };
}
