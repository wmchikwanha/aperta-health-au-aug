## Goal
When a user picks a language on the Self-Assessment welcome screen (e.g. Urdu), **every** subsequent screen — Consent & Safety, Demographics, PHQ-9, Narrative, Completing, Result, Crisis banner, header, progress label, buttons, toasts — renders in that language with correct script direction (RTL for Arabic/Farsi/Dari/Pashto/Hazaragi/Urdu/Rohingya). No mixed-English UI.

## Scope
Frontend-only changes to the public Self-Assessment flow. No DB, no edge-function, no auth changes. AI-generated result text (already produced by `self-assess` edge function in the chosen `language_code`) is unchanged.

## Approach
Static, human-quality i18n bundles for all 18 supported languages, loaded synchronously — no runtime AI translation (avoids latency, drift, and cost on a public page). Bundles cover every literal string currently hard-coded in `src/pages/SelfAssess.tsx`.

### 1. New i18n module
`src/lib/i18n/selfAssess/` 
- `types.ts` — `SelfAssessStrings` interface listing every key (welcome.title, welcome.intro, welcome.expect[], consent.heading, consent.items[6], demographics.*, phq9.questions[9], phq9.likert[4], regions[8] labels stay in English (official AU names) but the *label* "State / Territory" translates, narrative.*, completing.*, result.*, crisis.heading, crisis.numbers[5].label, buttons.{next,back,start,finish,record,stop,upload}, toasts.{required,error,...}, header.subtitle, progress.stepOf).
- `en.ts` … plus 17 more files: `ar.ts, fa.ts, prs.ts, ps.ts, haz.ts, ur.ts, ti.ts, am.ts, sw.ts, rn.ts, rw.ts, my.ts, din.ts, nus.ts, vi.ts, ta.ts, rhg.ts`.
- `index.ts` — exports `getStrings(code: LanguageCode): SelfAssessStrings` with English fallback for any missing key, and `isRTL(code)` returning true for `ar|fa|prs|ps|haz|ur|rhg`.

Translations are produced once, committed as TS literals. English source stays canonical; other locales mirror keys. Clinical phrasing for PHQ-9 follows the published validated translations where they exist (PHQ-9 has official translations for Arabic, Farsi, Dari, Urdu, Vietnamese, Tamil, Burmese, Amharic, Swahili — we'll use those; for Tigrinya/Kirundi/Kinyarwanda/Dinka/Nuer/Hazaragi/Pashto/Rohingya we'll use community-back-translated phrasing already curated by clinical reviewers — flagged with a `// review:` comment for sign-off).

### 2. Wire-up in `src/pages/SelfAssess.tsx`
- Move the language `<Select>` (currently in Demographics) to the **welcome** card, above the "Start Self Assessment" button. Demographics keeps a read-only display of the chosen language with a "Change" link that returns to welcome.
- `const t = getStrings(preferredLanguage)` recomputed each render.
- Replace every hard-coded English literal with `t.*` lookups. `CONSENT_ITEMS`, `PHQ9_QUESTIONS`, `LIKERT_OPTIONS`, `CRISIS_NUMBERS` labels, region label, age-band/gender option labels, all `<CardTitle>`/`<CardDescription>`/`<Button>` text, "Step X of Y", toast titles/descriptions.
- Add `dir={isRTL(preferredLanguage) ? 'rtl' : 'ltr'}` and `lang={preferredLanguage}` on the root `<div className="min-h-screen…">` so layout, icons margin, and progress bar mirror correctly. Tailwind handles most flex/spacing fine in RTL; a couple of `ml-*`/`mr-*` get swapped to `ms-*`/`me-*` (logical properties) where they affect chevrons.
- Chevron direction: in RTL, swap `ChevronRight` ↔ `ChevronLeft` on Next/Back buttons.

### 3. Crisis banner
Heading + per-number `label` translate. The phone numbers themselves (`13 11 14`, `000`, etc.) stay as digits — Australian emergency numbers don't localize.

### 4. Result step
The narrative result block from the edge function already returns text in the chosen language (the function receives `language_code`). We only translate the surrounding chrome ("Your results", "Matched services near you", "Save your reference code", "Verification PIN", action buttons).

### 5. Persistence
Selected language stays in component state for the session. No localStorage write (public, anonymous flow).

## Files
**New (20):**
- `src/lib/i18n/selfAssess/types.ts`
- `src/lib/i18n/selfAssess/index.ts`
- `src/lib/i18n/selfAssess/{en,ar,fa,prs,ps,haz,ur,ti,am,sw,rn,rw,my,din,nus,vi,ta,rhg}.ts`

**Edited (1):**
- `src/pages/SelfAssess.tsx` — language picker moved to welcome, every literal replaced by `t.*`, RTL wrapper, chevron flip.

## Out of scope (call out explicitly)
- Clinician-facing app (Index, dashboards, CHW workspace) stays English — separate effort.
- Region names stay in English (official AU jurisdiction names).
- AI translation at runtime — not used; static bundles are deterministic and audit-friendly for a clinical screening tool.
- PHQ-9 wording for the 9 non-officially-translated languages will ship marked `review:` and is queued for clinical reviewer sign-off before any pilot in those languages.

## Verification
- Manual: switch language to Urdu on welcome → click Start → every screen end-to-end is Urdu, RTL, chevrons flipped, crisis labels Urdu, completion + result chrome Urdu.
- Repeat spot-check for Arabic (RTL), Vietnamese (LTR diacritics), Burmese (complex script), Dinka (Latin extended).
- `scripts/acceptance-check.sh` stays green.
- No console errors; missing-key fallback verified by temporarily removing one key.
