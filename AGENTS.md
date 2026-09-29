# Architecture Rules

- Clinical screening scores, crisis pathways, ATS triage, and mhGAP module selection use the versioned pure TypeScript rules engine; AI may extract facts or draft text but cannot override deterministic outputs, because clinical safety decisions must be reproducible and auditable.
- New screening records store a `rules_version_id`; historical MMSE records remain readable, while MMSE is unavailable for new assessments because it is licensed.
- Narrative processing is extraction-only and records model, prompt, and rules provenance; all resulting clinical suggestions require clinician review.
- Treatment-plan output is rejected when medication dosage patterns are detected, because Aperta must never prescribe or suggest specific dosages.