import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { containsMedicationDosage, normalizeCalculatedScores, selectMHGAPModule } from "./clinical-rules.ts";

Deno.test("selectMHGAPModule locks crisis and distress pathways", () => {
  assertEquals(selectMHGAPModule("active-suicidality", "immediate").moduleCode, "SUI");
  assertEquals(selectMHGAPModule("distress", "routine").moduleCode, "OTH-DWD");
});

Deno.test("containsMedicationDosage blocks explicit dosage instructions", () => {
  assertEquals(containsMedicationDosage("Start 20 mg daily"), true);
  assertEquals(containsMedicationDosage("Review medicines with the prescribing clinician"), false);
});

Deno.test("normalizeCalculatedScores keeps structured instrument records only", () => {
  const phq9 = { total_score: 12, severity_level: "moderate" };
  const gad7 = { total_score: 8, severity_level: "mild" };
  assertEquals(normalizeCalculatedScores({ PHQ9: phq9, GAD7: gad7, unknown: 999 }), { PHQ9: phq9, GAD7: gad7 });
});