export type MHGAPModule = { moduleCode: string; moduleName: string; interventions: string[] };

const MODULES: Record<string, MHGAPModule> = {
  suicide: { moduleCode: "SUI", moduleName: "Suicide / Self-Harm", interventions: ["Ensure immediate safety and supportive supervision", "Assess intent, plan, means and protective factors", "Arrange urgent referral and follow-up"] },
  psychosis: { moduleCode: "PSY", moduleName: "Psychoses", interventions: ["Use calm, non-confrontational engagement", "Assess risk and possible medical or substance causes", "Arrange specialist review"] },
  depression: { moduleCode: "DEP", moduleName: "Depression", interventions: ["Provide psychoeducation and psychosocial support", "Strengthen social supports", "Schedule outcome monitoring and follow-up"] },
  trauma: { moduleCode: "OTH-TRAUMA", moduleName: "Trauma-related distress", interventions: ["Use trauma-informed stabilisation", "Avoid repeated detailed trauma retelling", "Refer for culturally safe trauma-focused care"] },
  substance: { moduleCode: "SUB", moduleName: "Disorders due to substance use", interventions: ["Assess immediate intoxication or withdrawal risk", "Use brief motivational intervention", "Coordinate appropriate specialist support"] },
  distress: { moduleCode: "OTH-DWD", moduleName: "Distress without disorder", interventions: ["Validate distress without assigning a disorder", "Offer psychoeducation and practical psychosocial support", "Use watchful waiting with planned review"] },
};

export function selectMHGAPModule(diagnosticCategory: string, severity: string): MHGAPModule {
  const value = `${diagnosticCategory} ${severity}`.toLowerCase();
  if (value.includes("suicid") || value.includes("self-harm")) return MODULES.suicide;
  if (value.includes("psych") || value.includes("halluc")) return MODULES.psychosis;
  if (value.includes("substance") || value.includes("alcohol")) return MODULES.substance;
  if (value.includes("ptsd") || value.includes("trauma")) return MODULES.trauma;
  if (value.includes("depress") && !value.includes("minimal") && !value.includes("subthreshold")) return MODULES.depression;
  return MODULES.distress;
}

export function containsMedicationDosage(value: unknown): boolean {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return /\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|ml|units?)\b/i.test(text);
}

export function normalizeCalculatedScores(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return Object.fromEntries(Object.entries(input as Record<string, unknown>).filter(([key, value]) => /^[A-Z0-9-]{2,12}$/.test(key) && value && typeof value === "object"));
}