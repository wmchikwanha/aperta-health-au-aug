## Scope

Two partner-facing additions to Aperta. All UI-only, no schema changes — uses existing `facilities`, `facility_users`, `team_invitations`, `referrals` tables. Sample data is generated client-side from a curated set of CALD narratives.

---

## 1) FHIR R4 Export Sandbox

**Route:** `/fhir-sandbox` (admin + facility_admin only via `RoleGuard`)

**Component:** `src/pages/FHIRSandbox.tsx` + `src/lib/fhir/sampleBundle.ts`

**What it does**
- Dropdown of 4 sample narratives (Arabic-speaking refugee w/ PTSD; Dari-speaking adolescent w/ depression; Swahili-speaking torture survivor; English/Tigrinya code-switch grief reaction).
- "Generate FHIR Bundle" produces a valid R4 `Bundle` (type=`collection`) containing:
  - `Patient` — pseudonymous identifier, language, country of birth, visa status extension
  - `Encounter` — links Practitioner + Patient, status=finished
  - `Observation` × N — PHQ-9, GAD-7, PCL-5 scores with LOINC codes (reuses `SCREENING_INSTRUMENTS` from `scoringUtils.ts`), plus MSE narrative
  - `Condition` — provisional dx with ICD-10-AM F-code
  - `RiskAssessment` — crisis flags
  - `Composition` — case summary referencing all above
  - `Practitioner` — clinician stub
  - `AuditEvent` — generation record
- Three actions: **Preview** (syntax-highlighted JSON), **Download .json**, **Copy to clipboard**.
- "Validation notes" panel: required profiles (US Core / AU Base mapping), known gaps, partner test endpoints checklist.

---

## 2) Facility Pilot Onboarding Flow

**Route:** `/facility/onboarding` (facility_admin)

**Component:** `src/pages/FacilityOnboarding.tsx` with 5-step wizard via tabs:

1. **Facility profile** — confirm name, AU region, service type, MBS provider number (pre-filled from `facilities` row).
2. **Clinician seat provisioning** — bulk-add clinicians by email + role (psychiatrist / clinical_nurse / chw). Writes to `team_invitations` (existing table, existing tokenised flow). Shows seat counter.
3. **Referral onboarding** — toggles for inbound channels (self-assess portal, CHW upward referral, partner API), copy-to-clipboard intake URL with facility-scoped token.
4. **Test cases** — one-click "Seed 3 sample patients" button that creates demo `patients` rows tagged `is_demo=true` in metadata (no schema change — uses existing JSONB field). Each links to a corresponding FHIR sandbox narrative.
5. **Acceptance checklist** — interactive checklist persisted to `localStorage` keyed by facility_id:
   - [ ] Facility profile verified
   - [ ] ≥1 psychiatrist seat provisioned
   - [ ] ≥1 bicultural worker seat provisioned
   - [ ] Intake URL tested end-to-end
   - [ ] FHIR bundle downloaded and validated against partner schema
   - [ ] Crisis escalation pathway acknowledged
   - [ ] Data residency + privacy notice reviewed
   - [ ] Go-live sign-off (admin counter-signs)
   - Progress bar + "Submit for Aperta review" button (writes `audit_events` row, type=`facility_pilot_signoff`).

Add a "Pilot Onboarding" card on `FacilityDashboard` linking to the wizard with completion %.

---

## Files

**New**
- `src/pages/FHIRSandbox.tsx`
- `src/pages/FacilityOnboarding.tsx`
- `src/lib/fhir/sampleBundle.ts` (bundle builder + 4 narratives)
- `src/lib/fhir/sampleNarratives.ts`
- `src/components/facility/OnboardingChecklist.tsx`
- `src/components/facility/SeatProvisioning.tsx`

**Edited**
- `src/App.tsx` — two new routes
- `src/components/FacilityDashboard.tsx` — onboarding card
- `src/pages/Index.tsx` — admin nav link to FHIR sandbox

No DB migrations, no edge functions, no new secrets.

---

## Verification

- Run acceptance script (`scripts/acceptance-check.sh`) — must stay green.
- Generated FHIR JSON validates against `Bundle.entry[].resource.resourceType` shape; spot-check one bundle in chat.
- Onboarding checklist persists across refresh; submit writes one `audit_events` row.
