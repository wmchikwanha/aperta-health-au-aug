import { describe, expect, test } from "bun:test";
import { containsMedicationDosage, determineATSTriageLevel, determineCrisisPathway, determineDistressPathway, scoreGAD7, scoreHTQIV, scorePCL5, scorePHQ9, scorePRIMER5, scorePSQ, scoreRHS15, scoreSEWB, scoreWHODAS2, selectMHGAPModule } from "../src/lib/clinical-rules-engine";

describe("clinical rules engine", () => {
  test("scores PHQ-9 boundaries and item 9 crisis", () => {
    expect(scorePHQ9([0, 0, 0, 0, 0, 0, 0, 0, 1])).toEqual({ total: 1, severity: "minimal", item9Score: 1, crisisTriggered: true });
    expect(scorePHQ9([3, 3, 3, 3, 3, 3, 3, 3, 3]).severity).toBe("severe");
  });
  test("scores core instruments", () => {
    expect(scoreGAD7(Array(7).fill(2))).toEqual({ total: 14, severity: "moderate" });
    expect(scorePCL5(Array(20).fill(2))).toEqual({ total: 40, provisionalPTSD: true });
    expect(scorePSQ([1, 1, 1, 0, 0]).crisisTriggered).toBe(true);
    expect(scorePRIMER5([0, 0, 2, 0, 0]).psychosisRisk).toBe(true);
  });
  test("scores refugee and SEWB instruments", () => {
    expect(scoreRHS15([...Array(14).fill(1), 0]).positiveScreen).toBe(true);
    expect(scoreHTQIV(Array(16).fill(3)).probablePTSD).toBe(true);
    expect(scoreWHODAS2(Array(12).fill(1)).disabilityLevel).toBe("moderate");
    expect(scoreSEWB({ body: 4, mind_emotions: 1, family_kinship: 4, community: 4, culture: 4, country: 4, spirituality: 4, ancestors: 4 }).concerningDomains).toEqual(["mind_emotions"]);
  });
  test("routes crisis contacts and ATS deterministically", () => {
    const atsi = determineCrisisPathway({ phq9Item9: 1, isATSI: true });
    expect(atsi.crisisNumber).toContain("13YARN");
    expect(determineCrisisPathway({ phq9Item9: 1 }).crisisNumber).toContain("Lifeline");
    expect(determineATSTriageLevel({ crisisPathway: atsi, consciousness: "alert" }).atsLevel).toBe(2);
  });
  test("selects mhGAP and distress pathways without AI", () => {
    expect(selectMHGAPModule("depression", "severe").moduleCode).toBe("DEP");
    expect(determineDistressPathway([3, 0]).pathway).toBe("distress-without-disorder");
  });
  test("rejects invalid inputs and dosage output", () => {
    expect(() => scorePHQ9([0])).toThrow();
    expect(containsMedicationDosage("Take 20 mg daily")).toBe(true);
    expect(containsMedicationDosage("Medication classes only; no dose.")).toBe(false);
  });
});