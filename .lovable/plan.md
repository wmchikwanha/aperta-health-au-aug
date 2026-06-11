# Plan: Switch narrative processing to Gemini (Lovable AI Gateway)

## Why
`process-narrative` currently calls `https://api.anthropic.com/v1/messages` with `claude-sonnet-4-6` using `ANTHROPIC_API_KEY`. Failures the user is seeing are consistent with an expired/invalid Anthropic key. Lovable AI Gateway provides Google Gemini models out of the box via the auto-provisioned `LOVABLE_API_KEY` — no per-user billing setup, no extra secret, and strong multilingual quality (including Arabic, Farsi/Dari, Pashto, Hazaragi, Urdu, Tigrinya, Amharic, Swahili, Vietnamese, Tamil, Burmese, and code-switching).

## Model choice
- Default: **`google/gemini-2.5-pro`** for `process-narrative`. This is the strongest multilingual + clinical-reasoning Gemini in the gateway and the closest quality match to Claude Sonnet for nuanced cultural decoding. Worth the extra cost on this single high-value call.
- Fallback (if cost becomes a concern later): `google/gemini-3-flash-preview` — still excellent multilingual, much cheaper.
- No change to `transcribe-audio` (already uses Gemini via `GOOGLE_CLOUD_API_KEY`).

## What changes

### 1. `supabase/functions/process-narrative/index.ts`
- Remove the Anthropic fetch and `ANTHROPIC_API_KEY` check.
- Call the Lovable AI Gateway using its OpenAI-compatible chat completions endpoint:
  - URL: `https://ai.gateway.lovable.dev/v1/chat/completions`
  - Header: `Authorization: Bearer ${LOVABLE_API_KEY}`
  - Body: `{ model: "google/gemini-2.5-pro", stream: true, messages: [{role:"system", content: SYSTEM_PROMPT}, {role:"user", content: narrative}], response_format: { type: "json_object" } }`
- Keep the existing `SYSTEM_PROMPT` (Australian CALD/refugee idioms, ICD-10-AM, ATSI SEWB, crisis routing) **verbatim** — it's already tuned for the languages the user listed.
- Replace the Anthropic SSE parser (`content_block_delta` / `text_delta`) with the OpenAI-compatible SSE parser (`choices[0].delta.content`, terminator `data: [DONE]`).
- Preserve the existing streaming behaviour: progress pings every 15 tokens, final JSON validation, red-alert keyword scan, and the same final response shape — so the frontend needs **no changes**.
- Map gateway errors: `429` → existing rate-limit response; `402` → "AI credits exhausted, please add credits" message; other non-OK → generic 500 with body in logs.

### 2. No client changes
`InputZone.tsx` / wherever invokes `process-narrative` keeps working because the response envelope stays identical.

### 3. Optional cleanup (only if user confirms)
- Leave `ANTHROPIC_API_KEY` secret in place for now (other functions or future use); do not delete.
- Could also migrate `suggest-diagnosis`, `generate-treatment-plan`, `ask-ai` to Gemini in the same pass — flag but **don't do it in this plan** unless requested, to keep scope tight.

## Verification
1. Deploy the function.
2. From the preview, paste a short mixed-language narrative (e.g. Arabic + English with "ḍayqa ṣadr") into the clinical Input Zone and run Process Narrative.
3. Confirm: streaming progress events arrive, final JSON parses, `cultural_idioms_found` includes the Arabic idiom, `language_detected` reflects the mix, no 500.
4. Check edge function logs for any gateway error codes.

## Risk / notes
- Gemini's JSON-mode is reliable but occasionally wraps output; the existing ```json``` fence stripper stays in place as a safety net.
- `LOVABLE_API_KEY` is already provisioned (visible in project secrets) — no secret prompt needed.
- Quality for low-resource languages (Dinka, Nuer, Rohingya, Hazaragi) still relies on the interpreter-assist flag in the prompt; the model itself is best-effort for these — this is the same caveat that applied with Claude.

Shall I proceed in build mode?
