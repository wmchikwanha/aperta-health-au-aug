import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { containsMedicationDosage, normalizeCalculatedScores, selectMHGAPModule } from "./clinical-rules.ts";

Deno.test("selectMHGAPModule locks crisis and distress pathways", () => {
  assertEquals(selectMHGAPModule("active-suicidality", "immediate").moduleCode, "SUI");
  assertEquals(selectMHGAPModule("distress", "routine").moduleCode, "OTH");
});

Deno.test("containsMedicationDosage blocks explicit dosage instructions", () => {
  assertEquals(containsMedicationDosage("Start 20 mg daily"), true);
  assertEquals(containsMedicationDosage("Review medicines with the prescribing clinician"), false);
});

Deno.test("normalizeCalculatedScores removes unsupported values", () => {
  assertEquals(normalizeCalculatedScores({ PHQ9: 12, GAD7: 8, unknown: 999 }), { PHQ9: 12, GAD7: 8 });
});