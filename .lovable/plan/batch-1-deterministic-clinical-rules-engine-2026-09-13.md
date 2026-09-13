# Batch 1 — Deterministic Clinical Rules Engine

One batch only. This removes AI from scoring and crisis decisions, completes the refugee/ATSI screening pathway, and keeps Aperta functional throughout.

## What will change

### 1. One versioned clinical rules engine
- Add pure, input-validated TypeScript rules for PHQ-9, GAD-7, PCL-5, PSQ, PRIME-R-5, RHS-15, HTQ-IV, WHODAS 2.0, and ATSI Social and Emotional Wellbeing (SEWB).
- Return consistent scores, severity bands, flags, domain breakdowns, and a “distress without disorder” pathway for sub-threshold distress.
- Add deterministic crisis routing, mhGAP-IG v2.0 module selection, and Australasian Triage Scale classification. No AI call participates in these decisions.
- Keep an equivalent server-side rules module so backend functions independently validate safety-critical inputs rather than trusting browser-calculated values.

### 2. Immediate offline crisis response
- Rework PHQ-9 and PSQ forms to calculate as each answer changes and display a persistent red crisis panel without network access.
- Trigger crisis handling at PHQ-9 Item 9 ≥1 or PSQ total ≥3; also route PCL-5 ≥33 for urgent trauma review as specified by the rules engine.
- Show context-correct contacts: 13YARN for Aboriginal and Torres Strait Islander patients, Lifeline for general crisis support, 1800RESPECT for DFV, Suicide Call Back Service, and 000 for immediate danger.
- Block normal completion while a crisis is active until the clinician explicitly acknowledges the alert and opens/continues the crisis workflow; preserve offline saving after acknowledgement.

### 3. Complete refugee and ATSI instruments
- Consolidate the existing RHS-15, HTQ-IV and WHODAS logic into the new engine and update their forms to show live deterministic results.
- Implement a working SEWB assessment across body, mind/emotions, family/kinship, community, culture, country, spirituality, and ancestors, with domain-level concerns and culturally safe wording.
- Record the exact rules-engine version with every saved screening, including offline-queued screenings.
- Deactivate MMSE in the selector and show: “Requires licence — not available in this deployment.” Existing historical MMSE results remain readable.

### 4. Separate extraction, diagnosis, and treatment responsibilities
- Change narrative processing so AI only extracts structured clinical entities: complaints, duration/severity, cultural idioms, verbatim risk statements, mood, sleep/appetite/psychomotor changes, psychotic features, substance use, function, social/migration context, translation, and SEWB domains.
- Remove AI-generated scores, diagnoses, treatment advice, crisis classification, and ATS classification from narrative processing. The app will display the extracted record without pretending it is a completed MSE.
- Feed diagnosis suggestions only pre-extracted entities and deterministic screening results; validate suggested ICD-10-AM codes against the local code catalogue before returning them.
- Select the mhGAP module and baseline interventions deterministically before treatment-plan generation. AI may draft the narrative plan but cannot change the module or introduce medication dosages.
- Add server-side dosage-pattern rejection so unsafe treatment output is not returned.

### 5. Reproducible database records
- Create `rules_engine_versions` with version, effective date, scoring/pathway hashes, mhGAP version, instrument version, creator, and timestamps.
- Grant read access to authenticated users and full access to the service role; enable RLS with admin-only management.
- Add `rules_version_id` to `screening_assessments`, seed the active Batch 1 version, and attach it to all new screening saves.
- Preserve Batch 0 immutability, synthetic-data enforcement, audit logging, and AI provenance rules.

## Technical details
- Replace duplicate scoring spread across `scoringUtils`, `refugeeScreening`, and offline triage with adapters around the canonical engine, avoiding unrelated UI changes.
- Update screening result/context views to understand RHS-15, HTQ-IV, WHODAS 2.0, and SEWB.
- Update the narrative, diagnosis, and treatment edge functions together, then deploy all three as one coordinated release.
- Add automated known-input tests for every scoring function, crisis pathway/contact selection, ATS levels, mhGAP mapping, distress-without-disorder, invalid input rejection, and dosage rejection.
- Add browser checks for offline PHQ-9/PSQ alerts, ATSI 13YARN routing, MMSE deactivation, refugee/SEWB completion, and the clinician diagnosis/treatment handoff.

## Acceptance checks
- Every specified score and severity boundary passes deterministic tests.
- RHS-15, HTQ-IV, WHODAS 2.0, and SEWB can be completed and saved.
- Crisis warnings and correct phone numbers work while the browser is offline.
- A crisis screening cannot silently close through the normal save flow.
- Narrative AI returns extraction fields only—no scores, diagnosis, treatment, or AI-decided crisis level.
- Diagnosis receives structured entities plus calculated scores; treatment receives a locked deterministic mhGAP module.
- No medication dosage is accepted in treatment output.
- MMSE is unavailable for new use with the licensing notice visible.
- Every new screening stores the active rules version.
- Database migration, edge deployments, tests, build, security checks, and desktop/mobile workflow checks pass.

## Not in this batch
- Model registry and drift monitoring (Batch 2).
- New production data, publishing, or unrelated visual redesign.
