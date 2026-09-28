export const RULES_ENGINE_VERSION_ID = "b1000000-0000-4000-8000-000000000001";
export const RULES_ENGINE_VERSION = "1.0.0-batch1";

type PHQ9Severity = "minimal" | "mild" | "moderate" | "moderately-severe" | "severe";
type GAD7Severity = "minimal" | "mild" | "moderate" | "severe";
export type CrisisPathwayType = "active-suicidality" | "psychotic-agitation" | "dfv" | "command-hallucinations" | "child-safety" | "substance-crisis" | "safeguarding" | "none";
export type CrisisUrgency = "immediate" | "urgent" | "routine";
export type SEWBDomain = "body" | "mind_emotions" | "family_kinship" | "community" | "culture" | "country" | "spirituality" | "ancestors";

const ensureResponses = (responses: number[], expected: number, min: number, max: number, instrument: string) => {
  if (responses.length !== expected || responses.some(value => !Number.isInteger(value) || value < min || value > max)) {
    throw new RangeError(`${instrument} requires ${expected} responses between ${min} and ${max}.`);
  }
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function scorePHQ9(responses: number[]) {
  ensureResponses(responses, 9, 0, 3, "PHQ-9");
  const total = sum(responses);
  const severity: PHQ9Severity = total <= 4 ? "minimal" : total <= 9 ? "mild" : total <= 14 ? "moderate" : total <= 19 ? "moderately-severe" : "severe";
  const item9Score = responses[8] ?? 0;
  return { total, severity, item9Score, crisisTriggered: item9Score >= 1 };
}

export function scoreGAD7(responses: number[]) {
  ensureResponses(responses, 7, 0, 3, "GAD-7");
  const total = sum(responses);
  const severity: GAD7Severity = total <= 4 ? "minimal" : total <= 9 ? "mild" : total <= 14 ? "moderate" : "severe";
  return { total, severity };
}

export function scorePCL5(responses: number[]) {
  ensureResponses(responses, 20, 0, 4, "PCL-5");
  const total = sum(responses);
  return { total, provisionalPTSD: total >= 33 };
}

export function scorePSQ(responses: number[]) {
  ensureResponses(responses, 5, 0, 1, "PSQ");
  const total = sum(responses);
  return { total, crisisTriggered: total >= 3 };
}

export function scorePRIMER5(responses: number[]) {
  ensureResponses(responses, 5, 0, 6, "PRIME-R-5");
  return { total: sum(responses), psychosisRisk: responses.some(value => value >= 2) };
}

export function scoreRHS15(responses: number[]) {
  if (responses.length !== 15 || responses.slice(0, 14).some(value => !Number.isInteger(value) || value < 0 || value > 4) || !Number.isInteger(responses[14]) || responses[14] < 0 || responses[14] > 10) {
    throw new RangeError("RHS-15 requires 14 responses between 0 and 4 and one distress rating between 0 and 10.");
  }
  const symptomTotal = sum(responses.slice(0, 14));
  const total = symptomTotal;
  const symptomCluster = {
    somatic: sum([responses[0], responses[5]]),
    emotional: sum(responses.slice(1, 13)),
    cognitive: responses[13] ?? 0,
    distressThermometer: responses[14] ?? 0,
  };
  return { total, positiveScreen: symptomTotal >= 12 || symptomCluster.distressThermometer >= 5, symptomCluster };
}

export function scoreHTQIV(responses: number[]) {
  if (responses.length !== 16 && responses.length !== 46) throw new RangeError("HTQ-IV requires the 16 symptom items or the complete 46-item record.");
  ensureResponses(responses, responses.length, 1, 4, "HTQ-IV");
  const symptomResponses = responses.slice(-16);
  const total = sum(symptomResponses);
  const meanScore = Number((total / symptomResponses.length).toFixed(2));
  const exposureResponses = responses.length === 46 ? responses.slice(0, 30) : [];
  return {
    total,
    tortureExposure: exposureResponses.some(value => value >= 3),
    traumaEvents: exposureResponses.filter(value => value >= 2).length,
    meanScore,
    probablePTSD: meanScore >= 2.5,
  };
}

export function scoreWHODAS2(responses: number[]) {
  ensureResponses(responses, 12, 0, 4, "WHODAS 2.0");
  const total = sum(responses);
  const domainScores = {
    cognition: sum([responses[2], responses[5]]),
    mobility: sum([responses[0], responses[6]]),
    selfCare: sum([responses[7], responses[8]]),
    gettingAlong: sum([responses[9], responses[10]]),
    lifeActivities: sum([responses[1], responses[11]]),
    participation: sum([responses[3], responses[4]]),
  };
  const disabilityLevel = total <= 4 ? "none" : total <= 9 ? "mild" : total <= 14 ? "moderate" : total <= 19 ? "severe" : "extreme";
  return { total, domainScores, disabilityLevel };
}

const SEWB_DOMAINS: SEWBDomain[] = ["body", "mind_emotions", "family_kinship", "community", "culture", "country", "spirituality", "ancestors"];

export function scoreSEWB(responses: Record<string, number>) {
  const domainScores = Object.fromEntries(SEWB_DOMAINS.map(domain => {
    const value = responses[domain];
    if (!Number.isInteger(value) || value < 0 || value > 4) throw new RangeError(`SEWB ${domain} requires a response between 0 and 4.`);
    return [domain, value];
  })) as Record<SEWBDomain, number>;
  const total = sum(Object.values(domainScores));
  const concerningDomains = SEWB_DOMAINS.filter(domain => domainScores[domain] <= 1);
  const overallWellbeing = total >= 25 ? "strong" : total >= 17 ? "mixed" : "concerning";
  return { total, domainScores, overallWellbeing, concerningDomains };
}

export interface CrisisInputs {
  phq9Item9?: number;
  psqTotal?: number;
  pcl5Total?: number;
  rhs15Positive?: boolean;
  narrativeFlags?: string[];
  isATSI?: boolean;
}

export function determineCrisisPathway(inputs: CrisisInputs) {
  const flags = (inputs.narrativeFlags ?? []).map(flag => flag.toLowerCase());
  let pathwayType: CrisisPathwayType = "none";
  let urgency: CrisisUrgency = "routine";
  if ((inputs.phq9Item9 ?? 0) >= 1 || flags.some(flag => flag.includes("suicid") || flag.includes("self-harm"))) pathwayType = "active-suicidality";
  else if ((inputs.psqTotal ?? 0) >= 3 || flags.some(flag => flag.includes("psychotic agitation"))) pathwayType = "psychotic-agitation";
  else if (flags.some(flag => flag.includes("command hallucination"))) pathwayType = "command-hallucinations";
  else if (flags.some(flag => flag.includes("domestic violence") || flag.includes("gbv") || flag.includes("dfv"))) pathwayType = "dfv";
  else if (flags.some(flag => flag.includes("child"))) pathwayType = "child-safety";
  else if (flags.some(flag => flag.includes("substance"))) pathwayType = "substance-crisis";
  else if (flags.some(flag => flag.includes("abuse") || flag.includes("neglect") || flag.includes("safeguard"))) pathwayType = "safeguarding";

  if (["active-suicidality", "psychotic-agitation", "command-hallucinations", "child-safety"].includes(pathwayType)) urgency = "immediate";
  else if (pathwayType !== "none" || (inputs.pcl5Total ?? 0) >= 33 || inputs.rhs15Positive) urgency = "urgent";

  const crisisNumber = pathwayType === "dfv" ? "1800RESPECT 1800 737 732" : inputs.isATSI ? "13YARN 13 92 76" : pathwayType === "active-suicidality" ? "Lifeline 13 11 14 / Suicide Call Back 1300 659 467" : "Lifeline 13 11 14";
  const requiredActions = pathwayType === "none"
    ? [(inputs.pcl5Total ?? 0) >= 33 || inputs.rhs15Positive ? "Arrange urgent trauma-informed clinical review." : "Continue routine monitoring and psychoeducation."]
    : ["Do not leave the person unsupported.", "Open the crisis workflow and notify the supervising clinician.", "Call 000 if there is immediate danger.", "Acknowledge the alert before closing this screening."];
  return { pathwayType, urgency, requiredActions, crisisNumber, emergencyNumber: "000", sessionClosureBlocked: pathwayType !== "none" };
}

const MHGAP_MODULES = {
  suicide: { moduleCode: "SUI", moduleName: "Suicide / Self-Harm", interventions: ["Ensure immediate safety and supportive supervision", "Assess intent, plan, means and protective factors", "Arrange urgent referral and follow-up"] },
  psychosis: { moduleCode: "PSY", moduleName: "Psychoses", interventions: ["Use calm, non-confrontational engagement", "Assess risk and possible medical or substance causes", "Arrange specialist review"] },
  depression: { moduleCode: "DEP", moduleName: "Depression", interventions: ["Provide psychoeducation and psychosocial support", "Strengthen social supports", "Schedule outcome monitoring and follow-up"] },
  trauma: { moduleCode: "OTH-TRAUMA", moduleName: "Trauma-related distress", interventions: ["Use trauma-informed stabilisation", "Avoid repeated detailed trauma retelling", "Refer for culturally safe trauma-focused care"] },
  substance: { moduleCode: "SUB", moduleName: "Disorders due to substance use", interventions: ["Assess immediate intoxication or withdrawal risk", "Use brief motivational intervention", "Coordinate appropriate specialist support"] },
  distress: { moduleCode: "OTH-DWD", moduleName: "Distress without disorder", interventions: ["Validate distress without assigning a disorder", "Offer psychoeducation and practical psychosocial support", "Use watchful waiting with planned review"] },
} as const;

export function selectMHGAPModule(diagnosticCategory: string, severity: string) {
  const value = `${diagnosticCategory} ${severity}`.toLowerCase();
  if (value.includes("suicid") || value.includes("self-harm")) return MHGAP_MODULES.suicide;
  if (value.includes("psych") || value.includes("halluc")) return MHGAP_MODULES.psychosis;
  if (value.includes("substance") || value.includes("alcohol")) return MHGAP_MODULES.substance;
  if (value.includes("ptsd") || value.includes("trauma")) return MHGAP_MODULES.trauma;
  if (value.includes("depress") && !value.includes("minimal") && !value.includes("subthreshold")) return MHGAP_MODULES.depression;
  return MHGAP_MODULES.distress;
}

export function determineATSTriageLevel(inputs: { crisisPathway: ReturnType<typeof determineCrisisPathway>; vitalSigns?: Record<string, string | number | boolean>; consciousness?: string }) {
  const consciousness = (inputs.consciousness ?? "alert").toLowerCase();
  const unstableVitals = Object.values(inputs.vitalSigns ?? {}).some(value => value === false || value === "unstable");
  if (consciousness !== "alert" || unstableVitals || inputs.crisisPathway.pathwayType === "command-hallucinations") return { atsLevel: 1 as const, timeToTreatment: "Immediate" };
  if (inputs.crisisPathway.urgency === "immediate") return { atsLevel: 2 as const, timeToTreatment: "Within 10 minutes" };
  if (inputs.crisisPathway.urgency === "urgent") return { atsLevel: 3 as const, timeToTreatment: "Within 30 minutes" };
  if (inputs.crisisPathway.pathwayType !== "none") return { atsLevel: 4 as const, timeToTreatment: "Within 60 minutes" };
  return { atsLevel: 5 as const, timeToTreatment: "Within 120 minutes" };
}

export function determineDistressPathway(scores: number[]) {
  const elevated = scores.some(score => score > 0);
  return elevated
    ? { pathway: "distress-without-disorder", formulation: "Distress is present below disorder thresholds.", actions: MHGAP_MODULES.distress.interventions }
    : { pathway: "routine-wellbeing", formulation: "No current screening threshold is crossed.", actions: ["Continue routine wellbeing monitoring."] };
}

export function containsMedicationDosage(value: unknown): boolean {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return /\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|ml|units?)\b/i.test(text);
}