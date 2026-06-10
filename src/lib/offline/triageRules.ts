// Rule-based offline triage derived from WHO mhGAP-IG v2.0 (2016) decision
// logic. Runs entirely on-device — no AI, no network. Output is a structured
// recommendation card the CHW can show to the patient or print as a referral
// note when there is no connectivity.
//
// CRITICAL: This is a *screening triage*, not a diagnosis. All output is
// labelled as such so a CHW cannot mistake it for a clinical conclusion.

export type TriageUrgency = "urgent" | "routine" | "monitor";

export interface ScreeningInput {
  tool:
    | "PHQ9"
    | "GAD7"
    | "PCL5"
    | "MMSE"
    | "PSQ"
    | "PRIMER5";
  totalScore: number;
  /** PHQ-9 specifically — the item-9 (self-harm/suicide) raw response */
  phq9Item9?: number;
  /** PSQ specifically — number of endorsed psychotic-symptom items */
  psqEndorsed?: number;
}

export interface TriageRecommendation {
  urgency: TriageUrgency;
  pathway: string;
  reasoning: string[];
  /** mhGAP module(s) the CHW should reference if printing the referral */
  mhgapModules: string[];
  /** Concrete next-step instruction for the CHW */
  action: string;
  /** Whether crisis protocol must be invoked immediately */
  crisis: boolean;
  /** Always prefixed disclaimer on any displayed output */
  disclaimer: string;
}

const DISCLAIMER =
  "Rule-based screening triage from WHO mhGAP-IG v2.0. Not a diagnosis. Requires clinician review.";

export function computeOfflineTriage(inputs: ScreeningInput[]): TriageRecommendation {
  const reasoning: string[] = [];
  const modules = new Set<string>();
  let urgency: TriageUrgency = "monitor";
  let crisis = false;
  let pathway = "Routine follow-up";
  let action = "Schedule a routine review and continue supportive contact.";

  // Helper to upgrade urgency monotonically
  const setUrgency = (u: TriageUrgency) => {
    const rank = { monitor: 0, routine: 1, urgent: 2 } as const;
    if (rank[u] > rank[urgency]) urgency = u;
  };

  for (const input of inputs) {
    switch (input.tool) {
      case "PHQ9": {
        if ((input.phq9Item9 ?? 0) >= 1) {
          crisis = true;
          setUrgency("urgent");
          reasoning.push("PHQ-9 Item 9 ≥1 → active suicidal ideation. Crisis protocol required.");
          modules.add("mhGAP: SUI (Suicide / Self-Harm)");
          pathway = "Immediate crisis intervention and urgent referral";
          action =
            "Do not leave the patient unattended. Begin the in-app crisis checklist. Arrange same-day transfer or specialist contact.";
        } else if (input.totalScore >= 20) {
          setUrgency("urgent");
          reasoning.push(`PHQ-9 = ${input.totalScore} → severe depression.`);
          modules.add("mhGAP: DEP (Depression)");
          pathway = "Urgent referral for severe depression";
          action = "Refer urgently to a clinical nurse or psychiatrist. Initiate safety plan.";
        } else if (input.totalScore >= 10) {
          setUrgency("routine");
          reasoning.push(`PHQ-9 = ${input.totalScore} → moderate depression.`);
          modules.add("mhGAP: DEP (Depression)");
          pathway = "Routine referral for depression management";
          action = "Begin brief psychosocial intervention; schedule follow-up within 2 weeks.";
        } else if (input.totalScore >= 5) {
          reasoning.push(`PHQ-9 = ${input.totalScore} → mild depression.`);
          modules.add("mhGAP: DEP (Depression)");
        }
        break;
      }
      case "GAD7": {
        if (input.totalScore >= 15) {
          setUrgency("routine");
          reasoning.push(`GAD-7 = ${input.totalScore} → severe anxiety.`);
          modules.add("mhGAP: OTH (Other Significant Mental Health Complaints)");
          pathway = "Routine referral for anxiety management";
          action = "Provide psychoeducation and refer for psychotherapy.";
        } else if (input.totalScore >= 10) {
          reasoning.push(`GAD-7 = ${input.totalScore} → moderate anxiety.`);
          modules.add("mhGAP: OTH (Other Significant Mental Health Complaints)");
        }
        break;
      }
      case "PCL5": {
        if (input.totalScore >= 33) {
          setUrgency("routine");
          reasoning.push(`PCL-5 = ${input.totalScore} → probable PTSD.`);
          modules.add("mhGAP: OTH — trauma pathway");
          pathway = "Trauma-focused care pathway";
          action = "Refer for trauma-focused psychological intervention. Avoid re-traumatising questioning.";
        }
        break;
      }
      case "MMSE": {
        if (input.totalScore < 18) {
          setUrgency("urgent");
          reasoning.push(`MMSE = ${input.totalScore} → severe cognitive impairment.`);
          modules.add("mhGAP: DEM (Dementia)");
          pathway = "Urgent cognitive workup";
          action = "Refer for neurological evaluation. Rule out reversible causes (delirium, B12, thyroid).";
        } else if (input.totalScore < 24) {
          setUrgency("routine");
          reasoning.push(`MMSE = ${input.totalScore} → mild cognitive impairment.`);
          modules.add("mhGAP: DEM (Dementia)");
          pathway = "Routine cognitive assessment";
          action = "Schedule full cognitive assessment; review medications for cognitive side effects.";
        }
        break;
      }
      case "PSQ": {
        const endorsed = input.psqEndorsed ?? input.totalScore;
        if (endorsed >= 3) {
          setUrgency("urgent");
          crisis = true;
          reasoning.push(`PSQ endorsed items = ${endorsed} → likely psychosis.`);
          modules.add("mhGAP: PSY (Psychoses)");
          pathway = "Urgent psychosis pathway";
          action = "Refer same-day. Use the in-app crisis checklist. Ensure safety of patient and family.";
        } else if (endorsed >= 1) {
          setUrgency("routine");
          reasoning.push(`PSQ endorsed items = ${endorsed} → screen positive for psychotic symptoms.`);
          modules.add("mhGAP: PSY (Psychoses)");
          pathway = "Routine psychiatric review for positive psychosis screen";
          action = "Refer for psychiatric interview within 1 week.";
        }
        break;
      }
      case "PRIMER5": {
        if (input.totalScore >= 10) {
          setUrgency("routine");
          reasoning.push(`PRIME-R-5 = ${input.totalScore} → high prodromal symptoms.`);
          modules.add("mhGAP: PSY — early intervention");
          pathway = "Early-psychosis referral";
          action = "Refer to early-psychosis service; arrange close monitoring.";
        }
        break;
      }
    }
  }

  if (reasoning.length === 0) {
    reasoning.push("No screening thresholds crossed. Continue routine monitoring.");
  }

  return {
    urgency,
    pathway,
    reasoning,
    mhgapModules: Array.from(modules),
    action,
    crisis,
    disclaimer: DISCLAIMER,
  };
}
