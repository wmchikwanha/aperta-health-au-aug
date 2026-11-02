import { describe, it, expect } from "bun:test";
import { applyAIProvenance, reviewDecision, AI_PROVENANCE_SYSTEM } from "./aiProvenance";

describe("AI provenance", () => {
  it("adds ai-generated-draft tag and keeps it when approved", () => {
    const r = applyAIProvenance({ resourceType: "Condition", id: "1" }, { model_id: "m" }, { approver: "Dr A", approved_at: "t" });
    const codes = r.meta.tag.filter((t: any) => t.system === AI_PROVENANCE_SYSTEM).map((t: any) => t.code);
    expect(codes).toEqual(["ai-generated-draft", "clinician-approved"]);
  });
  it("classifies review decisions", () => {
    expect(reviewDecision("F32.1", "f32.1")).toBe("accepted");
    expect(reviewDecision("F32.1", "F43.1")).toBe("modified");
    expect(reviewDecision("F32.1", null)).toBe("rejected");
  });
});
