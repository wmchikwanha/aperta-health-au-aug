# Nzwisiso — Technical Roadmap
### Decision Document for Project Leadership
*Prepared: March 2026 | Status: For Review and Decision*

---

## Context

A full technical audit of the Nzwisiso V3.0 codebase has been completed. The audit assessed
standards compliance, clinical safety architecture, data sovereignty, and readiness for the
EVAH Initiative RFP submission (deadline: April 1, 2026).

This document presents two technical paths forward and a clear recommendation.

---

## What the Audit Found

### Strengths
- Solid React/TypeScript frontend with all six screening instruments implemented (PHQ-9, GAD-7,
  PCL-5, MMSE, PSQ, PRIME-R-5)
- ICD-11 and DSM-5 diagnostic code library is well-structured
- Cultural idiom decoding in the AI prompts is clinically appropriate and genuinely
  differentiating
- Appointment scheduling UI and Twilio SMS reminder system are functional
- Crisis protocols are comprehensive and WHO mhGAP aligned
- Multi-language support (7 languages + code-switching) is implemented

### Critical Gaps Found
The following gaps must be addressed before clinical validation or RFP submission:

| # | Gap | Severity |
|---|-----|----------|
| 1 | AI still running on Gemini 2.5 Flash via Lovable gateway — not Claude | Critical |
| 2 | Date of birth and phone numbers stored in database — both are PII, violates core constraint and POPIA | Critical |
| 3 | No audit trail implemented anywhere — required for SaMD compliance | Critical |
| 4 | Diagnosis codes stored without FHIR system URIs — not interoperable | High |
| 5 | Language stored as plain text ("Shona") not BCP-47 codes (sn) — not standards compliant | High |
| 6 | Gender stored as plain text ("Male") not FHIR administrative-gender codes | High |
| 7 | Screening scores stored without LOINC codes — limits reporting and interoperability | High |
| 8 | No patient consent resource — required for MRCZ ethics and POPIA | High |
| 9 | Appointment types have no formal coding system | Medium |
| 10 | Referral form exists in UI but referrals are never saved to the database | Medium |
| 11 | No ICD-10 support — ICD-10 has wider regional penetration than ICD-11 | Medium |
| 12 | Data stored in flat tables, not FHIR R4 resources — limits system integration | Medium |

---

## Two Paths Forward

---

## Approach 1 — Incremental Standards Compliance
### "Fix what exists. Make it credible. Ship it."

### What This Is
Keep the existing Supabase/PostgreSQL stack. Fix the critical and high-severity gaps
in-place, without changing the database engine or rebuilding any major components.
The app continues to work throughout. No downtime. No migration risk.

### What Gets Fixed

**Week 1 — Critical Fixes**

| Task | Description | Outcome |
|------|-------------|---------|
| Claude migration | Replace all 6 AI edge functions: swap Lovable/Gemini endpoint for Anthropic Claude API (`claude-sonnet-4-6`) | AI calls use Constitutional AI safety model, consistent with RFP narrative |
| Remove PII | Remove `date_of_birth` field from patient schema. Replace with age band (`18–25`, `26–35`, etc.). Remove phone number from patient record — refactor SMS reminder to use a separate, consent-gated contact table | POPIA compliant. Ethics-approvable. |
| Audit trail | Add `audit_events` table to Supabase. Write an audit record on every clinician approval, AI generation, and data modification | SaMD non-negotiable satisfied |

**Week 1–2 — Standards Coding**

| Task | Description | Outcome |
|------|-------------|---------|
| FHIR system URIs on diagnosis codes | Add `system` field to all ICD-11 and DSM-5 codes in `diagnosticCodes.ts` and to all stored diagnostic records | FHIR-interoperable diagnosis data |
| LOINC codes on screening scores | Map PHQ-9, GAD-7, PCL-5, MMSE, PSQ, PRIME-R-5 to their LOINC codes. Store alongside scores | Queryable, reportable, interoperable screening data |
| BCP-47 language codes | Map "Shona" → `sn`, "Ndebele" → `nd`, "Zulu" → `zu`, "Xhosa" → `xh`, "Sotho" → `st`, "Afrikaans" → `af`, "Swahili" → `sw` | Standards-compliant language data for reporting |
| FHIR administrative-gender | Map "Male" → `male`, "Female" → `female` | Standards alignment |
| ICD-10 codes | Add ICD-10 code set to diagnostic library | Wider regional interoperability |

**Week 2 — Clinical Safety & Consent**

| Task | Description | Outcome |
|------|-------------|---------|
| Consent record | Add `consent` table. Record patient consent for data processing and AI use at point of registration | MRCZ ethics requirement satisfied |
| Persist referrals | Wire the existing `ReferralForm` UI to save referral records to the database | Referral audit trail established |
| Fix appointment coding | Add a formal code system to appointment types | Standards alignment |

### Timeline
**2 weeks.** App is fully functional throughout.

### Cost
Developer time only. No new infrastructure. No new service costs.

### What This Achieves
- Passes MRCZ ethics review
- Satisfies POPIA data requirements
- Provides credible SaMD audit trail
- AI runs on Claude with Constitutional AI safety
- Sufficient for EVAH RFP submission — demonstrates tool maturity and standards awareness
- Sufficient for validation study (n=25) to proceed
- Data is standards-aligned and ready for FHIR migration when funded

### What This Does Not Achieve
- Data is not stored as native FHIR R4 resources
- Cannot plug directly into MOH health information systems or FHIR servers
- Population-level FHIR queries not possible (limits advanced reporting)
- Full data sovereignty (MongoDB `af-south-1`) not yet implemented

---

## Approach 2 — Full FHIR Architecture Rebuild
### "Build it right. Build it once."

### What This Is
A ground-up rebuild of the data layer. Every clinical data object is stored as a
FHIR R4 compliant JSON document in MongoDB Atlas (`af-south-1`, Cape Town). All AI
functions are rewritten to produce and consume FHIR resources. The frontend is
refactored to work with the new data structures.

Because there is no real patient data in the system (only test data), there is no
migration — this is a clean rebuild from a blank database.

### Architecture

```
Vercel (frontend)
└── React/TypeScript SPA
        ↓
    Supabase Auth (unchanged)
    └── Edge Functions (8 functions, rewritten)
            ↓ Claude API (claude-sonnet-4-6)
        Anthropic Claude API
            ↓ FHIR R4 documents
        MongoDB Atlas — af-south-1 (Cape Town)
        ├── Patient
        ├── Encounter
        ├── Observation          (MSE + screening scores with LOINC)
        ├── DiagnosticReport     (AI diagnostic suggestions with ICD-11/DSM-5)
        ├── Condition            (confirmed diagnoses)
        ├── CarePlan             (treatment recommendations)
        ├── RiskAssessment       (crisis events)
        ├── Questionnaire        (PHQ-9, GAD-7, PCL-5, MMSE, PSQ, PRIME-R-5)
        ├── QuestionnaireResponse (patient screening responses)
        ├── Appointment + Schedule + Slot
        ├── ServiceRequest       (referrals)
        ├── Consent
        ├── Practitioner + PractitionerRole
        ├── Organization + Location
        ├── Composition          (case summary / PDF source)
        └── AuditEvent           (immutable audit trail)
```

### What Gets Built

**Phase 1 — Infrastructure (Weeks 1–2)**
- MongoDB Atlas cluster, `af-south-1` region
- FHIR R4 collection schemas, validation rules, indexes
- MongoDB Data API connection from Supabase Edge Functions (Deno runtime)
- Environment configuration, secrets management

**Phase 2 — Core Resources (Weeks 2–5)**
- `Patient`, `Encounter`, `Practitioner`, `PractitionerRole`
- `Organization`, `Location` (enables multi-facility deployment)
- `AuditEvent` (immutable, written on every clinical action)
- `Consent` (patient consent tracking)

**Phase 3 — AI Functions Rewritten (Weeks 4–8)**
All 8 edge functions migrated to Claude + FHIR output. Each function produces
a valid FHIR resource and writes it to MongoDB. Each call also writes an `AuditEvent`.

**Phase 4 — Screening Instruments (Weeks 6–9)**
All 6 screening tools rebuilt as FHIR `Questionnaire` resources with item-level
LOINC codes. Each completion produces a `QuestionnaireResponse` and a scored
`Observation`. This is what enables proper population-level reporting.

**Phase 5 — FHIR Scheduling (Weeks 8–10)**
`Schedule`, `Slot`, and `Appointment` resources replace the flat appointments table.
Enables future integration with MOH or hospital scheduling systems via FHIR `$book`.

**Phase 6 — Frontend Refactor (Weeks 8–13)**
All data-connected React components updated to work with FHIR resource structures.
Analytics dashboard rebuilt on FHIR queries — population-level screening trends,
language distribution, crisis incidence, diagnostic category frequency.

**Phase 7 — PDF Export (Weeks 12–14)**
Case summary PDF generated from FHIR `Composition` resource — fully structured,
referenceable clinical document.

**Phase 8 — Testing and Clinical Validation (Weeks 14–17)**
- FHIR resource validation (HL7 official validator)
- Integration testing across all workflows
- Security review
- Clinical walkthrough with psychiatrist panel

### Timeline

| Team Size | Estimated Timeline |
|-----------|-------------------|
| 1 developer | 20–28 weeks |
| 2 developers | 12–16 weeks |
| 2 developers + FHIR specialist | 8–12 weeks |

### Cost
- Developer time (the dominant cost)
- MongoDB Atlas: ~$60–200/month depending on usage (free tier available for development)
- No additional AI cost beyond current Claude API usage

### What This Achieves
- Full FHIR R4 compliance — native interoperability with MOH systems, EHRs, FHIR servers
- Data sovereignty: all clinical data on African continent (`af-south-1`)
- Population-level FHIR queries unlock research-grade reporting
- `Questionnaire`/`QuestionnaireResponse` enables instrument versioning and item-level analysis
- Production-grade architecture — supports community health worker rollout and multi-country scale
- Strongest possible position for regulatory submissions (SaMD, MRCZ, SAHPRA)
- Interoperability with OpenHIE, FHIR-enabled national health information systems

### What This Does Not Achieve in the Short Term
- Cannot be completed before the April 1, 2026 RFP deadline
- App is effectively under construction during the build — not demoable mid-rebuild

---

## Side-by-Side Comparison

| Dimension | Approach 1 | Approach 2 |
|-----------|------------|------------|
| Timeline | 2 weeks | 8–28 weeks |
| Cost | Dev time only | Dev time + MongoDB ($60–200/mo) |
| RFP ready by April 1 | Yes | No |
| Validation study ready | Yes | Only if starting immediately with 2+ devs |
| POPIA compliant | Yes (removes PII) | Yes (af-south-1 + no PII) |
| FHIR native | No (FHIR-aligned) | Yes (fully FHIR R4) |
| MOH system integration | Limited | Full |
| Population reporting | Basic | Research-grade |
| SaMD audit trail | Yes | Yes |
| Risk | Very low | Medium (rebuild complexity) |
| Reversibility | High | N/A — clean start |

---

## Recommendation

**Do Approach 1 now. Plan Approach 2 with EVAH funding.**

The rationale:

1. **The RFP deadline is real.** April 1, 2026 is 4 weeks away. Approach 2 cannot
   be completed in that window by any realistic team size.

2. **There is no data to migrate.** The database contains only test data. This means
   when the time comes, Approach 2 is a clean build — not a migration. The complexity
   does not increase by waiting.

3. **Approach 1 closes the critical gaps.** The PII issue, missing audit trail, and
   Gemini dependency are the genuine blockers for ethics approval and RFP credibility.
   All three are resolved in Week 1 of Approach 1.

4. **Approach 1 data is compatible with Approach 2.** The coding standards work
   (LOINC, BCP-47, FHIR system URIs) done in Approach 1 carries forward. It is not
   wasted effort.

5. **Funding changes the equation.** Approach 2 done properly requires dedicated
   developer time over 2–4 months. That is a post-funding activity. The EVAH
   Pathway A award ($1M) creates the conditions to do it right.

**Proposed sequencing:**

```
Now → April 1       Approach 1: 2-week incremental fix
                    → Ethics-approvable
                    → RFP-submittable
                    → Validation study (n=25) proceeds

April → July        EVAH review period
                    → Refine validation study
                    → Begin Approach 2 design with funded team

Post-award          Approach 2: Full FHIR rebuild
                    → MongoDB Atlas af-south-1
                    → Claude-native AI pipeline
                    → Production-grade, MOH-integrable system
```

---

## Decision Required

The project leadership team is asked to confirm:

- [ ] Approved: Proceed with Approach 1 immediately
- [ ] Deferred: Further discussion required
- [ ] Alternative: Proceed with Approach 2 (requires team capacity confirmation)

---

*Document prepared by Claude Code (claude-sonnet-4-6) in technical review session*
*Based on full audit of Nzwisiso V3.0 codebase, March 2026*
*For questions on technical content: Pearce Mutendera (Technical/Clinical Reviewer)*
*For questions on clinical content: Walter Mangezi (Clinical Lead)*
