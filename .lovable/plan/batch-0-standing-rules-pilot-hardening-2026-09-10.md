# Batch 0 — Standing Rules + Pilot Hardening

One batch only. This installs the permanent architecture rules and makes it unmistakable that Aperta is running as a pilot on synthetic data.

## What you will see

- A slim, always-visible strip on every screen: "PILOT DEMO — SYNTHETIC DATA ONLY — NOT FOR CLINICAL USE".
- Every PDF export (case summary, treatment plan, screening, assessment) carries the same wording in the header and footer, and FHIR sandbox bundles carry a pilot label.
- 15 demo clients seeded with realistic multilingual stories — Arabic (3), Farsi/Dari (3), Burmese (2), Tigrinya (2), Swahili (2), Vietnamese (1), Tamil (1), English (1) — including one suicide-risk case, one high trauma case, one Aboriginal social-and-emotional-wellbeing story, one child-safeguarding scenario, and one mixed-language story.
- An admin-only "Reset demo data" button that wipes and reseeds the demo clients.
- Appointment SMS reminders stay switched off while pilot mode is on; each suppressed message is recorded in the activity log.

## Current state confirmed

- No pilot settings table, and no "synthetic" marker on patients, worker sessions, assessments or screenings.
- No audio recordings table exists; that item is skipped rather than invented.
- `assessments` has no `updated_at`; `patients`, `chw_sessions`, `screening_assessments` have created/updated timestamps but no `created_by`.
- AI-output tables carry no model or prompt provenance columns.

## Database work

1. `pilot_config` — single row: `pilot_mode` (default true), `allow_real_data` (default false), `pilot_version`, `pilot_end_date`. Readable by all authenticated users, writable by admins only.
2. Add `synthetic boolean not null default true` to `patients`, `chw_sessions`, `assessments`, `screening_assessments`. A `BEFORE INSERT` trigger forces `synthetic = true` whenever `pilot_mode` is on.
3. Add missing `created_by uuid` and `updated_at` columns (plus the shared updated-at trigger) to the clinical tables above.
4. Add provenance columns to AI-output tables (`assessments`, `diagnostic_formulations`, `treatment_notes`): `model_id`, `model_version`, `prompt_template_id`, `prompt_template_version`, `ai_generated boolean default true`, `provenance jsonb`. Values are populated by the edge functions in this batch where they are already known; the registry that manages them is Batch 2.
5. Revoke UPDATE/DELETE from `authenticated` on `assessments`, `screening_assessments`, `treatment_notes`, `fhir_resources`, `audit_events`, `consents`; keep `service_role` full access and drop client-side update/delete policies that conflict.
6. `reset_demo_data()` security-definer function, admin-only: deletes clinical rows for demo patients, reseeds the 15 synthetic clients, writes an `audit_events` row.

## Application work

- `PilotBanner` component mounted once in the app shell, non-dismissible, offset-aware so it never covers the header or floating buttons.
- Shared `pilotWatermark` helper used by all four PDF exporters and by the FHIR sandbox bundle output.
- `send-appointment-reminder` and `check-upcoming-appointments` read `pilot_config`; when pilot mode is on they skip the Twilio call and write `audit_events` with action `reminder_suppressed_pilot`.
- Admin Dashboard gains a "Reset demo data" action with a confirm dialog, calling the RPC.
- Seed data is written as a SQL seed inside the reset function so the same content is used at first install and on every reset.
- Every AI output shown in the UI keeps the prefix "AI-generated suggestion requiring clinical review", and the same string is stored in the output metadata.

## Standing rules recorded

The seven architectural rules (RLS-enforced access, immutable clinical tables, full audit rows, AI calls only in edge functions, provenance on all AI output, deterministic scoring only, mandatory AI-review prefix) are saved to project memory so every later batch follows them without being re-stated.

## Not in this batch

Deterministic scoring engine and refugee instruments (Batch 1), model registry and drift monitoring (Batch 2).
