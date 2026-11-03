// Measurement-based care: reliable-change thresholds for repeated PHQ-9 / GAD-7.
// Mirrors public.check_score_deterioration() in the database (PHQ-9 >= 5, GAD-7 >= 4).

export const RELIABLE_CHANGE: Record<string, number> = { PHQ9: 5, GAD7: 4 };

export type Trend = "deteriorated" | "improved" | "no_reliable_change" | "insufficient_data";

export function normaliseTool(tool: string): string {
  return tool.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function reliableChange(tool: string, scores: number[]): { trend: Trend; delta: number | null; threshold: number | null } {
  const threshold = RELIABLE_CHANGE[normaliseTool(tool)] ?? null;
  if (threshold === null || scores.length < 2) return { trend: "insufficient_data", delta: null, threshold };
  const delta = scores[scores.length - 1] - scores[scores.length - 2];
  if (delta >= threshold) return { trend: "deteriorated", delta, threshold };
  if (delta <= -threshold) return { trend: "improved", delta, threshold };
  return { trend: "no_reliable_change", delta, threshold };
}
