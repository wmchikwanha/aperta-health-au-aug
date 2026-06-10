# CLAUDE.md — Nzwisiso Project Context

> This file is the single source of truth for AI-assisted development on the Nzwisiso project.
> Read this at the start of every session. Update it when architectural decisions change.

---

## What Nzwisiso Is

Nzwisiso is an AI-powered clinical decision support tool for mental health, purpose-built for
Southern African primary and community healthcare settings. The name means "knowledge" or
"understanding" in Shona.

**Core function:** A clinician speaks to a patient. Nzwisiso listens, transcribes (in local
languages), and generates structured clinical outputs — all subject to mandatory clinician
review and approval. Nothing is finalised without explicit clinician sign-off.

**Core philosophy:** "AI suggests, clinician decides."

**The problem it solves:** Zimbabwe has 19 psychiatrists for 15 million people (0.1 per 100,000).
94% are concentrated in Harare. The mental health treatment gap is 85–98%. Frontline workers
are making mental health decisions without training or tools, in languages that standard
clinical software doesn't support.

---

## Clinical Outputs

The system produces the following for each patient encounter:

1. **Mental Status Examination (MSE)** — structured output from unstructured clinical narrative
2. **Screening scores** — auto-scored: PHQ-9, GAD-7, PCL-5, MMSE, PSQ, PRIME-R-5
3. **Differential diagnosis** — mapped to ICD-11 and DSM-5 codes
4. **Treatment formulation** — WHO mhGAP aligned, evidence-based, no medication dosages
5. **Crisis intervention pathway** — 6 protocol types, triggered by PHQ-9 Item 9 ≥1 or PSQ ≥3
6. **Case summary** — exportable clinical record

---

## Languages Supported

- English
- Shona
- Ndebele
- siZulu
- Xhosa
- Sotho
- Mixed-language (code-switching)

---

## Current State (V3.0)

- Built on Lovable (React/TypeScript SPA)
- Beyond proof of concept, entering structured clinical validation
- Validation study underway with specialist psychiatrists
- Target: MRCZ (Medical Research Council of Zimbabwe) ethics approval
- **Being re-architected** — see Target Architecture below

---

## Strategic Context

### EVAH Initiative RFP
- **Funder:** Wellcome Trust / Bill & Melinda Gates Foundation / Novo Nordisk Foundation
- **Deadline:** April 1, 2026, 10:00am EDT
- **Pathway:** A ($1M, 3–12 months)
- **Focus:** Evaluation of AI-enabled clinical decision support for frontline workers in
  Sub-Saharan Africa
- **Key criteria:**
  - MANDATORY: Geographic/local leadership (Lead PI must be regionally based)
  - MANDATORY: Tool maturity (V3.0 satisfies this)
  - HIGH: System integration (FHIR addresses this)
  - PRIORITY: Equity focus (frontline/community health worker scope must be addressed)
  - 80% of funds must flow to regional entities

### Open RFP Issues to Resolve
- [ ] Named clinical partner (MOH, public sector facility, or NGO) — mandatory
- [ ] Lead PI confirmed as regionally based
- [ ] Frontline worker user scope explicitly addressed (current validation targets
      psychiatrists/registrars — RFP wants community health workers)
- [ ] SaMD (Software as a Medical Device) regulatory framing documented
- [ ] Global Access Plan drafted
- [ ] Budget structured with 80% regional flow
- [ ] Team structure and compensation formalised

---

## Target Architecture

### Decision Log
| Decision | Rationale |
|----------|-----------|
| Replace Gemini 2.5 Flash → Claude (`claude-sonnet-4-6`) | Constitutional AI safety framework better suited to clinical context; stronger refusal behaviour for SaMD compliance; better long-form clinical narrative processing |
| Replace PostgreSQL → MongoDB Atlas (South Africa region) | FHIR resources are JSON documents — natural fit for document store; flexible schema handles FHIR extensibility. Two viable hosting options: AWS `af-south-1` (Cape Town) or Azure South Africa North (Johannesburg) — both satisfy POPIA data residency requirement. Azure Health Data Services ruled out: cost and data residency outside South Africa are disqualifying. Final choice between AWS/Azure based on team operational preference. |
| Keep Supabase | Auth, RBAC, and Edge Functions remain — avoids full rewrite of auth layer |
| Export from Lovable → GitHub | Production-grade re-architecture requires proper version control; Lovable served prototyping purpose |
| Frontend hosting → Vercel | Replaces Lovable hosting; simple deployment from GitHub |

### Architecture Diagram

```
Vercel (frontend hosting)
└── React/TypeScript SPA
        ↓ auth / JWT
    Supabase
    ├── Auth (users, RBAC, JWT)
    └── Edge Functions (8 functions → Claude API)
            ↓ AI inference
        Anthropic Claude API
        └── Model: claude-sonnet-4-6
            ↓ read/write FHIR R4 resources
        MongoDB Atlas
        └── Region: af-south-1 (Cape Town)
            └── FHIR R4 Collections (see below)
```

---

## FHIR R4 Data Model (MongoDB Collections)

All clinical data is stored as FHIR R4 compliant JSON documents in MongoDB Atlas.

| FHIR Resource | Replaces (PostgreSQL) | Purpose |
|---------------|----------------------|---------|
| `Patient` | `patients` | Pseudonymised patient entity. Clinician-defined identifiers only. No PII stored. |
| `Encounter` | `assessments` | The clinical session — links Patient to all clinical outputs |
| `Observation` | `screening_assessments` | MSE outputs and screening scores (PHQ-9, GAD-7, PCL-5, MMSE, PSQ, PRIME-R-5) |
| `DiagnosticReport` | `diagnostic_formulations` | AI-generated diagnostic suggestions with ICD-11/DSM-5 codes |
| `CarePlan` | `treatment_notes` | Evidence-based treatment recommendations, WHO mhGAP aligned |
| `RiskAssessment` | `crisis_interventions` | Crisis flags, severity levels, intervention checklists |
| `Composition` | PDF export logic | Full case summary — structured document for referral/records |
| `Practitioner` | `profiles` + `user_roles` | Clinician identity, mapped to Supabase auth UID |
| `AuditEvent` | Audit trail fields | Immutable audit log — replaces `approved_by`, `approved_at` fields |
| `Appointment` | `appointments` | Scheduling and follow-up tracking |

### Patient Identity Model
- No PII stored at any point
- `Patient.identifier` uses clinician-defined reference codes only
- `Patient.id` is a system-generated UUID
- Conversations/encounters must always be linked to a Patient entity
- This was a gap in V3.0 — conversations were not anchored to patient objects

---

## Supabase Edge Functions (to be re-pointed to Claude)

Each function currently calls Gemini 2.5 Flash. All to be migrated to `claude-sonnet-4-6`.

| Function | Purpose | Target Latency |
|----------|---------|----------------|
| `process-narrative` | Voice/text → AI MSE generation | 5–10s |
| `transcribe-audio` | Multilingual audio transcription | TBD |
| `process-document` | Document upload processing | TBD |
| `suggest-diagnosis` | ICD-11/DSM-5 diagnostic suggestions | 8–15s |
| `generate-treatmentplan` | WHO mhGAP aligned treatment recommendations | 8–12s |
| `ask-ai` | General clinical AI assistant | TBD |
| `check-upcoming-appointments` | Appointment reminders | <1s |
| `send-appointment-reminder` | Notification dispatch | <1s |

### Claude API Integration Pattern

```javascript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": Deno.env.get("ANTHROPIC_API_KEY"),
    "anthropic-version": "2023-06-01"
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    system: SYSTEM_PROMPT, // clinical context, safety guardrails
    messages: [{ role: "user", content: clinicalNarrative }]
  })
});
```

### Claude Prompt Requirements (Safety-Critical)
All Claude prompts for clinical functions MUST include:
- Explicit instruction that Claude is a documentation/decision support aid only
- Instruction never to prescribe specific medication dosages
- Instruction to flag uncertainty rather than confabulate
- Cultural context for Southern African idioms of distress
- Instruction to always recommend clinician review
- Output format instructions (structured JSON for FHIR mapping)

---

## SaMD (Software as a Medical Device) Considerations

Three workflows trigger SaMD classification concerns:
1. **Diagnosis Formulation** — AI suggesting ICD-11/DSM-5 codes
2. **Treatment Planning** — AI generating treatment recommendations
3. **Crisis Intervention** — AI triggering crisis protocols

### Required Mitigations
- All three workflows require mandatory clinician sign-off before finalisation
- Audit trail via FHIR `AuditEvent` resource is non-negotiable
- Confidence ratings must accompany all AI outputs
- Source citations must be included in treatment recommendations
- "AI-generated suggestion requiring clinical review" prefix on all AI outputs
- No medication dosages under any circumstances

### Evidence Base Disclosure (Treatment Planning)
Treatment recommendations in `generate-treatment-plan` are grounded in **mhGAP Intervention
Guide v2.0 (2016)** as encoded in Claude's training data (knowledge cutoff: August 2025). This
means:
- No live WHO API is called — recommendations reflect guidelines as of model training
- Post-August 2025 WHO guideline updates will not be reflected until the model is updated
- NICE guidelines serve as a secondary reference, also via training knowledge

**Required disclosure language** for regulatory submissions (MRCZ) and grant applications (EVAH RFP):

> *"AI-generated treatment recommendations are grounded in WHO mhGAP Intervention Guide v2.0
> (2016) and NICE guidelines as represented in the Claude Sonnet model's training data
> (Anthropic, knowledge cutoff August 2025). Recommendations do not incorporate post-training
> WHO or NICE guideline updates. All recommendations require mandatory clinician review before
> clinical action."*

**Roadmap:** Post-funding, implement RAG over the mhGAP-IG v2.0 PDF to make the evidence
source explicit, auditable, and version-controlled rather than implicit in model weights.

---

## Validation Study Design

- **Sample:** n=25, purposive, convergent mixed-methods
- **Cohort:** Specialist Psychiatrists (gold standard), Mental Health Nurses,
  General Nurses, Occupational Therapists, Clinical Officers/Students
- **Gold Standard:** Clinical vignettes → independent review → consensus panel
  → Cohen's kappa ≥ 0.70

### Success Metrics
| Pillar | Instrument | Target |
|--------|-----------|--------|
| Acceptability | AIM | ≥ 4.0/5 |
| Feasibility | FIM | ≥ 4.0/5 |
| Desirability (Usability) | SUS | ≥ 68 |
| Fidelity | Task completion vs Gold Standard | ≥ 80% concordance |

### Research Objectives
1. Validate multilingual voice-to-code accuracy against Gold Standard
2. Assess Automation Bias and clinician over-reliance risks
3. Evaluate usability across 5 distinct clinical cadres
4. Test offline mitigation strategies in low-connectivity settings

---

## Data Sovereignty & Compliance

| Regulation | Jurisdiction | Status |
|-----------|-------------|--------|
| POPIA | South Africa | MongoDB Atlas `af-south-1` addresses stored data. Claude API calls to Anthropic US servers — acknowledge in RFP, mitigate via data processing agreements |
| Zimbabwe Data Protection Act | Zimbabwe | Review required |
| Kenya Data Protection Act | Kenya | Review required if expanding |
| MRCZ Ethics Approval | Zimbabwe | Targeting — in progress |

---

## Key Constraints & Non-Negotiables

- No PII stored anywhere in the system
- No medication dosages prescribed or suggested
- Clinician approval required before any output is finalised
- Full audit trail on all clinical actions
- Crisis alerts (RED ALERT) must be immediate, persistent, and require acknowledgement
- All AI outputs prefixed: *"AI-generated suggestion requiring clinical review"*
- Offline capability required for screening forms in low-connectivity settings
- FHIR R4 compliance is mandatory for all clinical data

---

## Deployment Targets

- Zimbabwe (primary)
- South Africa
- Botswana
- Zambia
- Future: PHC settings, community health workers, nurses, occupational therapists

---

## Team

- **Walter M. Chikwanha** — AI Innovation Lead, Zimbabwe
- **Walter Mangezi** — Clinical Lead
- **Pearce Mutendera** — Technical/Clinical Reviewer (raised key architecture questions)
- Clinical consortium — specialist psychiatrists (validation partners, TBC formal roles)
- Additional team structure TBC for RFP submission

---

## Open Technical Questions

- [ ] Offline strategy for AI functions in low-connectivity settings
      (open-weight model fallback? cached responses? graceful degradation?)
- [ ] Whether to add ICD-10 support alongside ICD-11
      (ICD-10 has wider penetration in the region per Pearce's note)
- [x] Which evidence/protocol APIs to call for treatment recommendations
      **Decision (March 2026):** No formal WHO mhGAP API exists. WHO does not expose mhGAP-IG
      content as a queryable endpoint (only ICD-11 API and document repositories). For the EVAH
      RFP and validation study, the current approach stands: Claude's training knowledge of
      mhGAP-IG 2.0 (2016). This limitation must be explicitly disclosed in all regulatory and
      RFP submissions (see SaMD section). Future option: RAG over mhGAP-IG PDF — planned,
      post-funding (see `docs/idiom-rag-architecture.md` for the RAG pattern).
- [ ] MongoDB Atlas connection from Supabase Edge Functions
      (use MongoDB Data API over HTTPS — works from Deno edge runtime)
- [ ] LLM fallback strategy if Claude API is unavailable

---

## File Structure Notes

> Update this section once repo has been explored

```
/src
  /components     — React UI components
  /pages          — Route-level pages
  /hooks          — Custom React hooks
  /integrations   — Supabase client config
/supabase
  /functions      — Edge functions (to be migrated to Claude)
```

---

*Last updated: March 2026*
*Maintained by: Claude (claude.ai) in coordination with Walter Chikwanha*
*Next update trigger: When source code has been reviewed and file structure confirmed*
