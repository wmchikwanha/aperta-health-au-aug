
## Problem

The scoring logic and reference data already exist but are invisible to users (and to an Australian review panel):
- `src/lib/screening/refugeeScreening.ts` — scoring for RHS-15, HTQ-IV, WHODAS 2.0, GDS-15, plus ATS triage. **No forms, not in the tool selector.**
- `src/lib/mbs/itemCatalogue.ts` — MBS Better Access item catalogue with rebates. **Only mentioned as a text label in `TreatmentPlanSuggestions.tsx`; no browsable UI.**

An assessor opening the app today sees only PHQ-9/GAD-7/PCL-5/MMSE/PSQ/PRIME-R-5 and no MBS anywhere.

## Scope

Frontend + one DB migration (tool_type check constraint). No changes to AI/edge functions, auth, or business rules.

## Changes

### 1. Add refugee screening forms
Create four new forms mirroring the existing pattern (`PHQ9Form.tsx` style: Likert grid → local scoring via `refugeeScreening.ts` → save to `screening_assessments` → show `ScreeningResults`):

- `src/components/screening/RHS15Form.tsx` — 14 × 0–4 Likert + distress thermometer 0–10, uses `scoreRHS15`.
- `src/components/screening/HTQ4Form.tsx` — 16 × 1–4 Likert, uses `scoreHTQ4`.
- `src/components/screening/WHODAS2Form.tsx` — 12 × 0–4 Likert, uses `scoreWHODAS2`.
- `src/components/screening/GDS15Form.tsx` — 15 yes/no, uses `scoreGDS15`.

### 2. Wire them into the selector and Index
- `ScreeningToolSelector.tsx`: append four tiles — RHS-15 (Refugee Health Screener), HTQ-IV (Harvard Trauma), WHODAS 2.0 (Function/Disability), GDS-15 (Geriatric Depression). Group visually as "Refugee & CALD Battery" and "Older Adults".
- `src/pages/Index.tsx`: add four `selectedScreeningTool === "…"` branches rendering the new forms.
- `src/components/screening/ScreeningResults.tsx`: extend `TOOL_NAMES` and `maxScores` map for the new IDs, with a note that RHS-15/WHODAS are higher = worse and GDS-15 higher = worse (MMSE remains the sole "higher is better" case).

### 3. DB migration — allow the new tool_type values
Extend the check constraint on `public.screening_assessments.tool_type`:

```sql
ALTER TABLE public.screening_assessments DROP CONSTRAINT IF EXISTS screening_assessments_tool_type_check;
ALTER TABLE public.screening_assessments ADD CONSTRAINT screening_assessments_tool_type_check
  CHECK (tool_type IN ('PHQ9','GAD7','PCL5','MMSE','PSQ','PRIMER5','RHS15','HTQ4','WHODAS2','GDS15'));
```

### 4. Make MBS visible
- New `src/components/mbs/MBSItemCatalogue.tsx` — searchable/filter-by-provider table over `MBS_MENTAL_HEALTH_ITEMS` (item number, short name, provider, rebate AUD, telehealth, notes). Header states rebates are indicative (from the catalogue's own preamble) and to confirm against MBS Online.
- New route/tab entry from the sidebar/nav (e.g. "MBS Reference") rendering that component.
- In `TreatmentPlanSuggestions.tsx`, add a "Suggested MBS items" panel that shows the `RECOMMENDED_REFUGEE_MHTP_BUNDLE` items (2717 / 2712 / 80000 / 80125 / 715) with rebate and telehealth flags, so MBS is evident inside the clinical workflow — not only in a reference page.

### 5. Access control
`canAccessFullScreening(userRole)` already gates the full battery; the four new tools inherit the same gate. Bicultural Workers keep the current PHQ-9-only view.

## Out of scope

- No changes to `process-narrative`, `generate-treatment-plan`, or `suggest-diagnosis` prompts (the prompts already reference these tools).
- No changes to permissions/RBAC beyond the existing full-battery flag.
- ATS triage derivation (`deriveATS`) is left for a follow-up — not requested here.

## Technical notes

- Forms follow the existing local-only scoring pattern: compute with `refugeeScreening.ts`, then `supabase.from('screening_assessments').insert({...})` with `tool_type`, `total_score`, `severity_level`, `interpretation`, `responses` (JSONB array), `patient_id`, `user_id`. RLS/GRANTs already in place for that table.
- RHS-15 stores responses as `{ items: number[14], distressThermometer: number }`.
- MBS component is pure client-side over the static catalogue — no query needed.

## Files touched

Created:
- `src/components/screening/RHS15Form.tsx`
- `src/components/screening/HTQ4Form.tsx`
- `src/components/screening/WHODAS2Form.tsx`
- `src/components/screening/GDS15Form.tsx`
- `src/components/mbs/MBSItemCatalogue.tsx`
- One Supabase migration extending the `tool_type` check constraint.

Edited:
- `src/components/screening/ScreeningToolSelector.tsx`
- `src/components/screening/ScreeningResults.tsx`
- `src/pages/Index.tsx` (form branches + MBS nav entry)
- `src/components/TreatmentPlanSuggestions.tsx` (MBS bundle panel)
