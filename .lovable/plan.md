
# Aperta Health — Australian Refugee/CALD Mental Health CDSS

Re-skin and re-target the existing Nzwisiso app as **Aperta Health — Mental Health Decision Support**, preserving the FHIR architecture, offline-first PWA, RBAC engine, AI-assisted MSE pipeline, and Supabase backend. The remix is deep but does **not** require schema rewrites — most work is copy, role-label, language list, screening battery, demo data, AI system prompt, and visual identity.

Delivered in four sequenced phases so each is independently demoable and reviewable.

---

## Phase 1 — Brand, copy, identity, and global safety scaffolding
Goal: a stranger landing on the app sees "Aperta Health, Australian CDSS" everywhere within the first interaction.

1. **Rename + tagline**
   - All "Nzwisiso" / "Mental Health Clinical Assistant" → **"Aperta Health — Mental Health Decision Support"**.
   - Tagline: *"Opening the space between clinical precision and cultural understanding."*
   - Sweep: `index.html`, `manifest.webmanifest`, `Auth.tsx`, `Footer.tsx`, `AboutDialog.tsx`, `HelpCentre.tsx`, README, CLAUDE.md (kept as historical context but headlined as Aperta), all page titles/meta.
2. **Visual identity**
   - Update `index.css` + `tailwind.config.ts` design tokens to: primary `#0071b3`, teal `#00857b`, warm grey `#6b6b6b`, white. Remove African motif accents. Inter (headings) + Source Sans Pro (body) via Google Fonts.
   - Acknowledgement of Traditional Owners on splash/auth screen.
3. **Compliance furniture (visible everywhere)**
   - Header badge: *"Data Sovereign — Hosted in Australia. Privacy Act 1988 (APPs)."*
   - Footer: *"Aperta Health is a TGA Class I Clinical Decision Support System… Final clinical decisions remain the responsibility of the registered health practitioner."*
   - First-run **Collection Notice** modal (AWS Sydney storage, Anthropic AI processing, 7-year retention, pseudonymisation).
   - Remove all POPIA/MRCZ/Zimbabwe/Shona/Ndebele references project-wide (rg sweep).
4. **Crisis numbers**: Replace Zimbabwean hotlines in `crisisProtocols.ts`, `SafetyAlert.tsx`, and self-assess pages with Lifeline 13 11 14, Suicide Call Back 1300 659 467, 13YARN 13 92 76, 1800RESPECT.

---

## Phase 2 — Roles, languages, idioms, screening battery
Goal: clinically correct for Australian refugee health.

1. **RBAC relabel (display-only — DB enum stays for now)**
   - In `permissions.ts` add display map: `chw → Bicultural Worker`, `clinical_nurse → Refugee Health Nurse`, `psychiatrist → Psychiatrist / Clinical Psychologist`. Add new logical role label **"GP"** mapped onto existing `clinical_nurse` or `psychiatrist` tier (final mapping confirmed in build); a future migration can add a real `gp` enum value.
   - Rename CHW workspace surfaces (`CHWWorkspace.tsx`, `chw/*`) labels to "Bicultural Worker" without changing routes.
2. **Languages** — rewrite `src/lib/languages.ts`:
   - Remove: Shona, Ndebele.
   - Keep: English, Arabic, Swahili, Mandarin, Vietnamese.
   - Add: Dari (`prs-AF`), Pashto (`ps-AF`), Urdu (`ur-PK`), Kirundi (`rn-BI`), Kinyarwanda (`rw-RW`), Burmese (`my-MM`), Dinka (`din` — interpreter-only flag), Nuer (`nus` — interpreter-only flag).
   - Add `interpreterAssisted: boolean` field; UI surfaces "Bicultural Interpreter Mode" for those languages (English narration captured, ASR bypassed, AI tags idioms).
3. **Cultural idioms** — replace `culturalIdioms.ts` with the Dari/Arabic/Urdu/Dinka/Nuer/Swahili/Vietnamese idiom table from the brief, each mapped to MSE component for the Claude prompt.
4. **Screening battery**
   - Add **RHS-15** (Refugee Health Screener) as a new screening tool with offline scoring; add DB `tool_type` value via migration + GRANT (respecting check constraint memory).
   - Add **PHQ-9 Refugee Modified** variant (Item 3 omitted with clinician override).
   - Scaffold **HTQ Part IV** (trauma event checklist) and **WHODAS 2.0** (functional impairment).
   - Add **GDS-15** for older patients.
   - Update `ScreeningToolSelector.tsx`, `scoringUtils.ts`, `screeningPdfExport.ts`.
5. **Triage scale** — replace Priority 1/2/3 with **ATS 1–5** + time-to-treatment targets in `triageRules.ts`, `OfflineTriageCard.tsx`, and any badge components.

---

## Phase 3 — Clinical workflow: MBS, visa, referrals, AI output shape
Goal: a GP could plausibly use the handover today.

1. **AI system prompt** (edge functions `process-narrative`, `suggest-diagnosis`, `generate-treatment-plan`, `ask-ai`):
   - Output sections in this order: Presenting Concern (patient words + culture) → MSE → Cultural Formulation → Risk Assessment → Suggested MBS MHTP criteria met → Suggested Referral Pathway.
   - Replace mhGAP grounding with **"Australian APS Guidelines + MBS Better Access criteria + RANZCP guidance"**; update the evidence-base disclosure string.
   - Inject CALD idiom dictionary as system context.
   - No medication dosages (already enforced — re-assert).
2. **MBS mapping** — new `src/lib/mbs/itemCatalogue.ts` with items 2710/2712/2715/2717/2721/2723/2725/2727/701/703/705 + 2026 rebate strings. `TreatmentPlanSuggestions.tsx` shows suggested item + estimated rebate.
3. **Visa status + NDIS gate**
   - Add `visa_status` to patient form (PR / TPV / SHEV / Asylum Seeker / Bridging / Other). Stored in existing `patients.metadata` JSONB (per data-model memory).
   - If not PR: banner *"Not eligible for NDIS — suggest community mental health / PASH / HeadtoHelp"* on treatment plan + referral screens.
4. **Torture & trauma referrals** — `src/lib/referrals/torturaTraumaServices.ts` keyed by state: STARTTS (NSW), Foundation House (VIC), QPASTT (QLD), Survivors of Torture and Trauma Assistance and Rehabilitation Service (SA), ASeTTS (WA), Phoenix (TAS), Companion House (ACT), Melaleuca (NT). Surface in `ReferralForm.tsx` based on patient state field.
5. **Aboriginal & Torres Strait Islander safety flag** — checkbox on patient form. If set: persistent banner *"This tool is not co-designed with Aboriginal and Torres Strait Islander communities. Consider SEWB framework. Crisis: 13YARN 13 92 76."*, exclude from research export by default, scaffold SEWB alt-MSE view (stub component).
6. **IHI placeholder + AU date format**
   - Add `ihi` field to patient form (16-digit, validation only — no HI Service call).
   - Global date format DD/MM/YYYY via a single `formatDate` util; sweep usages.

---

## Phase 4 — Demo data, dashboards, research scaffold, safety extras
Goal: a polished demo for PHN / university / NGO audiences.

1. **Demo cases** — replace `DemoScenarios.tsx` content with Tariq, Amara, Hassan, Priya, and Vietnamese Elder cases (full screening scores per brief). Source file: `src/data/demoCases.ts`.
2. **Dashboards** (`ClinicalDashboard.tsx`, `AnalyticsDashboard.tsx`):
   - "Community Screening Coverage" → "PHN Catchment Coverage".
   - New metrics: Medicare MHTP Completion Rate, Time to GP Referral, Bicultural Worker → Clinician Handover Time.
   - "Drugs Dispensed" tile → "Referrals Generated" (GP / psychologist / psychiatrist / crisis).
   - Remove any pharmaceutical stock UI (verify none present, otherwise delete).
3. **Research export scaffold** — `src/lib/research/deidentifiedExport.ts`: requires `ethics_id` + per-patient consent flag; default disabled in admin panel; excludes ATSI-flagged patients; RE-AIM tagged columns.
4. **Safety planning** (Priya case) — minimal safety plan component with "panic to 000" button + "disguise app icon" PWA toggle (manifest icon switch, deferred if non-trivial; document as scaffold).
5. **Offline tuning** — `registerSW.ts` sync retry → every 5 min, up to 72 h. Persist Interpreter Mode audio as English chunks only (skip ASR call).
6. **Acceptance sweep** — automated `rg` checks for: Nzwisiso, Zimbabwe, Shona, Ndebele, mhGAP, Priority 1/2/3, Lifeline-Zim numbers. CI-style script in `scripts/acceptance-check.sh`.

---

## Out of scope (named for transparency)
- Real My Health Record / IHI HI Service integration (requires ADHA accreditation) — scaffold only.
- AWS Sydney migration — already documented; backend remains Lovable Cloud (Supabase). UI states "Hosted in Australia" as the target posture; a follow-up infra task covers actual region pinning.
- True on-device ASR for Dinka/Nuer — explicitly Interpreter Mode instead.
- New `gp` role in the DB enum (display-label only this pass; DB migration deferred until role-permission matrix is signed off).
- Live MBS rebate lookup — using 2026 published rates as static constants.

---

## Technical notes (for engineers)
- **No destructive DB changes.** Only additive migration: extend `tool_type` check constraint to include `RHS-15`, `PHQ-9-Refugee`, `HTQ-IV`, `WHODAS-2`, `GDS-15`. Memory rule: include GRANTs.
- **Patient schema:** `visa_status`, `ihi`, `atsi_identifies`, `home_state` stored in `patients.metadata` JSONB to avoid migration churn this pass.
- **Edge functions:** only system prompt + output-shape changes; no new functions. Re-deploy `process-narrative`, `suggest-diagnosis`, `generate-treatment-plan`, `ask-ai`.
- **Languages:** `transcribeCode` for Dinka/Nuer set to `null` to force Interpreter Mode path in `transcribe-audio`.
- **Audit:** every AI output keeps the existing immutable audit-event flow.
- **Files added (illustrative):** `src/lib/mbs/itemCatalogue.ts`, `src/lib/referrals/torturaTraumaServices.ts`, `src/lib/research/deidentifiedExport.ts`, `src/data/demoCases.ts`, `src/components/compliance/CollectionNotice.tsx`, `src/components/compliance/ATSISafetyFlag.tsx`, `src/components/screening/RHS15Form.tsx`, `src/components/screening/WHODAS2Form.tsx`, `src/components/screening/GDS15Form.tsx`, `src/components/screening/HTQ4Form.tsx`, `scripts/acceptance-check.sh`.
- **Files heavily modified:** `index.html`, `manifest.webmanifest`, `index.css`, `tailwind.config.ts`, `src/lib/languages.ts`, `src/lib/culturalIdioms.ts`, `src/lib/firstaid/crisisProtocols.ts`, `src/lib/offline/triageRules.ts`, `src/lib/permissions.ts`, `src/lib/screening/scoringUtils.ts`, `src/components/Footer.tsx`, `src/components/PatientForm.tsx`, `src/components/TreatmentPlanSuggestions.tsx`, `src/components/DemoScenarios.tsx`, plus all edge function system prompts.
- **Build verification:** `rg` acceptance sweep + manual preview run-through of each demo case end-to-end.

---

Approve and I'll execute Phase 1 first, pause for visual review, then continue through Phases 2–4.
