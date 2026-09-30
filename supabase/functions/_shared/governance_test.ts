import { assert, assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkCaseOutput, summariseRun, zScore, driftFlag } from "./governance.ts";
import { composeConfig, AIConfigError, confidenceBand } from "./ai-registry.ts";

const good = JSON.stringify({ review_notice: "AI-generated suggestion requiring clinical review", language_detected: "ar", extracted_entities: {}, cultural_idioms_found: ["heart burning"] });

Deno.test("checklist passes valid output and catches dosage", () => {
  const c = checkCaseOutput(good, { required: ["language_detected", "extracted_entities"] }, true);
  assert(c.json_parses && c.schema_valid && c.review_prefix && c.no_dosage && c.idiom_flag_ok);
  const bad = checkCaseOutput(JSON.stringify({ review_notice: "clinical review", note: "sertraline 50 mg" }), {}, false);
  assertEquals(bad.no_dosage, false);
});

Deno.test("run fails when any dosage or missing preamble", () => {
  const ok = checkCaseOutput(good, { required: ["language_detected"] }, true);
  assert(summariseRun([ok, ok], true).passed);
  assertEquals(summariseRun([ok, ok], false).passed, false);
  const dose = checkCaseOutput(JSON.stringify({ review_notice: "clinical review", x: "10mg" }), {}, false);
  assertEquals(summariseRun([ok, dose], true).passed, false);
});

Deno.test("drift flags >2 SD", () => {
  assertEquals(zScore(1, [1, 1]), null);
  const hist = [0.1, 0.12, 0.11, 0.1, 0.09].map((v) => ({ avg_confidence: 0.8, override_rate: v, error_rate: 0 }));
  assertEquals(driftFlag({ avg_confidence: 0.8, override_rate: 0.11, error_rate: 0 }, hist).flagged, false);
  assert(driftFlag({ avg_confidence: 0.8, override_rate: 0.5, error_rate: 0 }, hist).flagged);
});

Deno.test("loader refuses missing or tampered config", () => {
  const prompt = { id: "p", version: "1", model_slot: "narrative", system_prompt: "x", safety_preamble_hash: "h" };
  const pre = { version: "1", preamble_text: "safe", preamble_hash: "h" };
  const model = { id: "m", model_id: "google/gemini-2.5-pro", model_version_label: "v1" };
  assertThrows(() => composeConfig("f", null, pre, model, "h"), AIConfigError);
  assertThrows(() => composeConfig("f", prompt, pre, null, "h"), AIConfigError);
  assertThrows(() => composeConfig("f", prompt, pre, model, "tampered"), AIConfigError);
  const cfg = composeConfig("f", prompt, pre, model, "h");
  assert(cfg.systemPrompt.startsWith("safe"));
  assertEquals(cfg.provenance.model_id, "google/gemini-2.5-pro");
});

Deno.test("confidence bands", () => {
  assertEquals(confidenceBand(0.9), "High");
  assertEquals(confidenceBand(0.8), "Medium");
  assertEquals(confidenceBand(0.4), "Low");
});
