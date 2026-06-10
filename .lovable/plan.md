
# Offline-first CHW workflow (Option A, English, low-end device)

Goal: a CHW with no signal on a 2GB Android can complete a full encounter and leave the clinic with actionable output. AI narrative summary and transcription fill in automatically the next time the device reaches the internet.

Designed for the worst-case device: no on-device LLM, no on-device Whisper, tight storage budget. Everything heavy runs in the cloud later.

## What the worker gets instantly offline

1. Full PHQ-9 / GAD-7 / PCL-5 / MMSE / PSQ / PRIME-R-5 with auto-scoring and severity bands
2. Crisis flag the moment PHQ-9 Item 9 ≥1 or PSQ ≥3, with the matching offline crisis protocol checklist
3. MSE form (structured, no AI) saved locally
4. Rule-based triage card: "Refer urgently / Refer routinely / Manage locally" derived from scores + crisis flags + a small mhGAP-derived decision table shipped in the app bundle
5. Voice recording captured to IndexedDB (webm/opus, chunked) — playback works offline, transcription queued
6. A printable / shareable encounter summary (local HTML → print) so the CHW can hand a paper copy to the patient or a referral facility even with zero connectivity

## What syncs later (silently, in background)

- Audio chunks → `transcribe-audio` edge function
- Transcript + structured fields → `process-narrative` for AI MSE
- AI diagnostic suggestions, treatment plan, audit events
- Each synced item updates the encounter in place; the UI marks fields as `provisional (offline)` vs `verified (cloud)`

## Architecture changes

### 1. PWA shell + service worker
- Add `vite-plugin-pwa` with `generateSW`, `registerType: autoUpdate`, NetworkFirst for HTML, CacheFirst for hashed assets, guarded registration (skip in Lovable preview/iframe/dev)
- Precache app shell, fonts, icons, crisis protocol content, mhGAP decision table JSON, screening tool definitions
- Excludes `/~oauth`

### 2. Local persistence (IndexedDB via Dexie)
Replace today's single `localStorage` queue with a typed IndexedDB store:

| Store | Purpose |
|---|---|
| `encounters` | Local FHIR-shaped Encounter draft (patient ref, started_at, status) |
| `screenings` | Completed screening assessments with score + severity |
| `mse_drafts` | Structured MSE input |
| `crisis_events` | Crisis checklist completions |
| `audio_chunks` | Blob chunks keyed by encounter_id + seq |
| `outbox` | Per-row sync state: pending / syncing / synced / failed + retry count + last_error |
| `cache_meta` | Last-sync timestamps, model version of decision table |

Storage budget target: < 50MB per CHW (roughly 30 encounters with ~10 min audio each at opus 16kbps).

### 3. Extended sync engine (replaces `useOfflineQueue`)
- Background sync via Service Worker `sync` event when supported, polling fallback otherwise
- Exponential backoff, idempotency keys per row, conflict rule = server wins for AI-generated fields, client wins for clinician-entered fields
- Progress + per-row status surfaced in the existing `OfflineBanner` / `OfflineQueueView`
- Sync only on Wi-Fi by default (configurable) to protect CHW data bundles

### 4. Provenance UI
Every AI-generated field in `PatientProfile`, `ClinicalAbstract`, case summary PDF shows a small badge:
- `Offline draft` (yellow) — clinician-entered locally, not yet AI-reviewed
- `Pending cloud review` (blue) — queued
- `Cloud verified` (green) — AI output returned and clinician-approved
- `Sync failed — retry` (red) — surfaced with one-tap retry

### 5. Rule-based offline triage (no LLM)
Ship `src/lib/offline/triageRules.ts` encoding mhGAP-IG v2.0 decision logic:
- PHQ-9 ≥20 or Item 9 ≥1 → urgent referral
- PCL-5 ≥33 → trauma pathway
- PSQ ≥3 → psychosis referral
- MMSE <24 → cognitive workup
- Otherwise → routine follow-up
Output: a one-page recommendation card + printable referral note, fully offline. Clearly labelled "rule-based screening triage, not a diagnosis."

### 6. Installable + storage-resilient
- Add web manifest (standalone display, icons, theme color) so CHWs install to home screen
- Request persistent storage (`navigator.storage.persist()`) so IndexedDB isn't evicted
- "Storage used / remaining" indicator in settings so the CHW knows when to find Wi-Fi

### 7. Audio capture for low-end devices
- Force opus 16 kbps mono in MediaRecorder
- Hard cap per encounter (e.g. 15 min) with warning
- VAD trimming reused from existing recorder to drop silence before storing

## Out of scope for this iteration (named so funders see the roadmap)

- On-device transcription (Whisper.cpp) — Year-2, requires Capacitor wrap
- On-device LLM for MSE — needs mid-range device + Capacitor
- Shona/Ndebele/Zulu offline transcription — research workstream with regional NLP partner
- Clinic edge node (Option C) — separate hardware + deployment plan
- True peer-to-peer sync between CHW phones — not in this phase

## What to tell partners and the EVAH RFP

> Nzwisiso runs as an installable Progressive Web App. With no internet, a community health worker can complete the full structured assessment — screening, scoring, crisis protocols, MSE, and rule-based mhGAP triage — and hand the patient a printed referral. Voice recordings and AI narrative summaries queue locally and sync automatically when the device next reaches connectivity, with every clinical field clearly labelled as offline draft, pending review, or cloud verified. On-device generative AI for local-language transcription is a Year-2 deliverable requiring a regional NLP partnership and native mobile packaging.

## Technical details (for engineers)

- Libraries to add: `vite-plugin-pwa`, `dexie`, `workbox-window` (only via plugin)
- New files (illustrative): `src/lib/offline/db.ts`, `src/lib/offline/sync.ts`, `src/lib/offline/triageRules.ts`, `src/lib/offline/audioStore.ts`, `src/components/OfflineEncounterBanner.tsx`, `src/components/ProvenanceBadge.tsx`, `public/manifest.webmanifest`, `public/icons/*`
- Modified: `src/hooks/useOfflineQueue.ts` (becomes a thin wrapper over Dexie sync engine), `src/hooks/useAudioRecorder.tsx` (write chunks to IndexedDB instead of memory), `src/components/PatientProfile.tsx` + `ClinicalAbstract.tsx` (provenance badges), `vite.config.ts` (PWA plugin), `src/main.tsx` (guarded SW registration)
- No DB migrations required for this phase — existing `screening_assessments`, `crisis_interventions`, `assessments`, `audit_events` tables receive the synced rows as today
- Edge functions unchanged; they just receive delayed traffic
- Build verification: confirm SW does not register in Lovable preview, NetworkFirst for HTML, IndexedDB write/read round-trip, sync resumes after `online` event

## Suggested execution order

1. PWA shell + manifest + guarded SW (installability, app shell offline)
2. Dexie schema + migrate existing `useOfflineQueue` to it (no behaviour change yet)
3. Audio chunk storage + queued upload
4. Offline triage rules + printable referral page
5. Provenance badges + sync status UI polish
6. Persistent storage request + storage-usage indicator
