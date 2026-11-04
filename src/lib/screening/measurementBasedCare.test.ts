// @ts-ignore bun runtime module
import { describe, expect, it } from "bun:test";
import { reliableChange } from "./measurementBasedCare";

describe("reliable change", () => {
  it("PHQ-9 rise of 5 is deterioration", () => {
    expect(reliableChange("PHQ-9", [8, 13]).trend).toBe("deteriorated");
  });
  it("PHQ-9 rise of 4 is not reliable change", () => {
    expect(reliableChange("PHQ9", [8, 12]).trend).toBe("no_reliable_change");
  });
  it("GAD-7 rise of 4 is deterioration", () => {
    expect(reliableChange("GAD-7", [5, 9]).trend).toBe("deteriorated");
  });
  it("PHQ-9 drop of 5 is improvement", () => {
    expect(reliableChange("PHQ-9", [18, 13]).trend).toBe("improved");
  });
  it("single score is insufficient", () => {
    expect(reliableChange("PHQ-9", [10]).trend).toBe("insufficient_data");
  });
});
