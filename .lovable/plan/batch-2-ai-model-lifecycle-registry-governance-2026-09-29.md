# Batch 2 — AI Model Lifecycle Registry + Governance

Goal: every AI answer in Aperta can be traced to a registered model, a versioned prompt and a versioned safety preamble. Models can only be switched after passing a regression suite. Confidence, clinician overrides and per-language drift are all recorded.

## What partners and reviewers will see
- **Admin > Model Registry**: both registered models (Gemini 2.5 Pro for narrative extraction, Gemini 3 Flash for diagnosis, treatment and Ask AI) with Candidate/Active/Retired status. There is a "Promote" button, and it only works when the latest regression run passed. Every promotion is recorded in the audit log.
- **Model Cards**: a readable card for each model covering intended use (decision support only), out-of-scope uses (dosages, autonomous diagnosis, use without clinician oversight), 18-language coverage, limitations, bias and ethics.
- **Safety Preambles & Prompts**: the current safety preamble (v1) and prompt templates per function, viewable by clinicians and editable only by admins.
- **Regression Suite**: a "Run regression" action with pass/fail history, based on golden test cases in all 18 languages.
- **Confidence badges** on diagnosis and treatment suggestions: High (>0.8), Medium (0.5–0.8), Low (<0.5).
- **Override capture**: when a clinician edits or rejects a suggestion, they pick a quick reason (AI missed cultural context, AI incorrect, Patient preference, Local guidelines differ, Translation issue, Other).
- **Governance dashboard**: override rate by function, language and clinician, plus weekly drift metrics per language. Any shift of more than 2 standard deviations from baseline is flagged.

## Delivery order
1. Database: registry, prompts, preambles, model cards, eval results, golden cases, confidence log, drift metrics. Access rules: all signed-in users can read, only admins can write. Logs can only be added to, never edited. Seed with v1 active models, prompts, preamble, both model cards and multilingual golden cases.
2. Shared AI loader for the backend functions: reads the active model, prompt and preamble, and refuses to run if any is missing. Every function returns and stores model_id, model_version, prompt_template_id and version.
3. Rewire process-narrative, suggest-diagnosis, generate-treatment-plan, ask-ai, transcribe-audio, process-document and self-assess to use the loader. This also fixes process-document, which currently sends a Gemini model name to the Anthropic API.
4. Confidence logging from diagnosis and treatment, plus badges and override-reason capture in the interface.
5. Backend functions `run-regression-suite` and `compute-drift-metrics` (weekly schedule, per-language baseline and flag).
6. Admin pages: Model Registry, Model Cards, Prompts/Preambles, Regression history, Governance dashboard.
7. Tests (loader refusal, promotion gate, drift flag maths, regression checklist), build, deploy, smoke check.

## Technical details
- New tables: `model_versions`, `prompt_templates`, `ai_safety_preambles`, `ai_model_cards`, `eval_results`, `golden_cases`, `ai_confidence_log`, `ai_drift_metrics`. Each has explicit grants and RLS.
- Promotion happens through a security-definer RPC `promote_model_version(id)`. It checks for the admin role and that the latest `eval_results.passed` is true, then retires the previous active version for the same function scope and writes `audit_events`.
- `prompt_templates.safety_preamble_hash` is a SHA-256 of the preamble. The loader checks the hash so mismatches are refused.
- Regression checklist: JSON parses, schema matches, review prefix present, no dosage match (shared `containsMedicationDosage`), idiom flags present where the case expects them.
- Drift: a z-score of the weekly avg_confidence, override_rate and error_rate against the trailing 8-week baseline, grouped by function and language. The weekly run is scheduled with pg_cron.
- The Batch 1 deterministic rules engine stays authoritative. Confidence and overrides never change scores, crisis pathways or ATS output.
