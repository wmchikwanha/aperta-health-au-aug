# Batch 3: Prompt Injection Hardening and Output Validation

Goal: hidden instructions in patient speech or uploaded documents, in any of the 18 languages, can never steer the AI. Malformed or unsafe AI output is never shown to clinicians. Every safety event becomes a trackable incident.

## What partners and reviewers will see
- **Injection protection**: if a narrative, transcript, document or question contains phrases like "ignore previous instructions", "you are now…" or system/role markers, the AI still runs, but those phrases are neutralised. The result is marked "Possible instruction-injection text detected" and the event is written to the audit log. The patterns cover English, Arabic, Farsi/Dari, Pashto, Urdu, Burmese, Tigrinya, Amharic, Swahili, Vietnamese, Tamil and the other supported languages.
- **Fail-safe output**: if the AI returns broken or incomplete data, Aperta retries once. If it fails again, it shows "AI suggestion unavailable, clinical review required" and never a half-finished result. Each failure automatically creates an incident.
- **Dosage block**: any medication dose in any AI output (narrative, diagnosis, treatment, Ask AI) fails validation and is never shown.
- **Cultural safety flag**: if a suggested diagnosis rests on an expression that the idiom list marks "do not pathologise" (for example "my heart is burning" as grief), the suggestion carries a visible "Cultural review required" flag.
- **"Report AI issue" button** on every AI output (narrative result, diagnosis, treatment plan, Ask AI). It offers the incident types from the spec, such as hallucination, missed crisis cue or translation error, plus a severity level.
- **Admin → AI Safety Incidents**: a list filtered by severity and status, with the workflow Open → Under review → CAPA → Closed, CAPA notes and the reviewer.
- **Public pages** (self-assessment and patient intake links): per-address and per-token rate limits, identical error messages so no one can guess valid codes, single-use short-expiry tokens, and logging of unusual activity.
- **Red-team tests**: adversarial cases in English, Arabic, Farsi, Burmese and Tigrinya are added to the regression suite. A model cannot be promoted unless it resists them.

## Delivery order
1. Database: `ai_incidents`, `ai_inference_events` (schema validity per call), `red_team_cases`, `public_rate_limits`, and a do-not-pathologise flag on the idiom list. Access rules: clinicians can report incidents and see their own reports, admins manage everything, and logs can only be added to.
2. Safety preamble v1.1 with the `<user_content>` rule, re-hashed. All prompts are moved to the new hash through the registry, so nothing is hardcoded.
3. Shared backend guards: multilingual injection detector and neutraliser, length caps, `<user_content>` wrapping, schema validator with one retry and fail-safe, dosage blocklist, cultural-safety check, inference-event logging and automatic incident creation.
4. Apply the guards to process-narrative, suggest-diagnosis, generate-treatment-plan, ask-ai, transcribe-audio, process-document and self-assess. Ask AI streams its answer, so it is checked as it streams: a dose cuts the answer off with a safe message.
5. Harden self-assess and validate-intake-token: rate limits, uniform errors, single-use tokens and anomaly logging.
6. Interface: injection, cultural-review and fail-safe banners, the "Report AI issue" dialog, and the admin incidents view.
7. Red-team cases added to the regression run (a model passes only if it resists 100% of them), plus tests, typecheck, deployment and a live injection check.

## Technical details
- `_shared/input-guard.ts`: a regex table per script/language with Unicode normalisation (NFKC, zero-width characters stripped). It flags and redacts matches as `[redacted-instruction]` and returns `{ text, detections[] }`. Default cap is 30k characters (documents 200k), configurable per function in the `prompt_templates.max_input_chars` column.
- `_shared/output-guard.ts`: lightweight schema checks (required keys and types) per function, `callWithValidation()` with one retry, then a typed fail-safe. It inserts into `ai_inference_events` and, on failure, an `ai_incidents` row (type `output_validation_failure`, created by the system).
- Cultural filter: compares the extracted idioms and the diagnosis evidence text against `cultural_idioms` entries where `do_not_pathologise = true`. The lexicon is stored in a database table seeded from `src/lib/culturalIdioms.ts`.
- Rate limits: a security-definer function `check_rate_limit(bucket, key_hash, limit, window)` over `public_rate_limits`, called only through the service role, with SHA-256 hashed IP addresses (no personal data stored).
- Red-team pass rule: no dosage, valid JSON, and none of the injected target strings (for example "PWNED", "risk_level") appearing in the output.
- The deterministic rules engine stays authoritative throughout. Guards can only block or flag; they never change scores or crisis pathways.
