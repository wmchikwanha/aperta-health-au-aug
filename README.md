# Aperta Health — clinician-governed AI documentation-support prototype

Aperta Health is a research prototype for multilingual and refugee mental health care in Australia. It keeps the speaker's original words beside every AI draft, logs each draft against the clinician's edits, and keeps risk decisions out of the language model.

**Status:** research prototype on synthetic data only. Never used with patients. Not a medical device and not production software.

**Design paper:** Chikwanha WM. *Keeping the patient's words: design of Aperta Health.* Working paper, Zenodo, 2026. doi:[10.5281/zenodo.23423486](https://doi.org/10.5281/zenodo.23423486)

## Safety design

- **Deterministic rules engine** for screening scores and crisis triggers, versioned and kept separate from the language model.
- **Clinician sign-off** required on every AI output; overrides need a reason and are stored with a diff.
- **Cultural-safety flags:** idioms of distress carry "do-not-pathologise" flags. The idiom library is drawn from published refugee mental health guidance and is provisional; no panel has reviewed it yet.
- **Guards** on input (multilingual prompt-injection checks, identifier scrubbing before any AI call) and output (schema validation with a fail-safe message).
- **Append-only audit trail** of AI generations, approvals and data changes.
- **Monitoring:** per-language drift metrics, a regression and red-team suite, and system alerts for crisis-pathway or AI failures.

## Build status

Batches 0–6 complete; Batch 7 (terminology curation) and a research-prototype wording pass are open. See `roadmap.md`.

## Security note

The Supabase publishable (anon) key in `netlify.toml` is intentionally public, as Supabase designs it to be. Service-role keys are read from the server environment only.

## Development

Built with [Lovable](https://lovable.dev) (Vite, React, TypeScript, Supabase edge functions).

```sh
git clone https://github.com/wmchikwanha/aperta-health-au-aug.git
cd aperta-health-au-aug
npm i
npm run dev
```

## Author

Walter M. Chikwanha · ORCID [0000-0002-1822-2168](https://orcid.org/0000-0002-1822-2168)
