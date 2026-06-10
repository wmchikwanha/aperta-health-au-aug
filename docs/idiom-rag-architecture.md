# Idiom Learning Pipeline — Architecture & Future RAG Plan

> **Status:** Phase 1 (human-in-the-loop submission + panel review) is implemented.
> This document describes the full planned architecture through to RAG-based retrieval.

---

## The Problem

The `culturalIdioms.ts` library embeds cultural idioms of distress **inline in the system prompt**.
This works at ≤80 idioms. As the library grows, two problems emerge:

1. **Token budget exhaustion** — the `process-narrative` system prompt is already large.
   At ~120 idioms (~3,000 tokens), there is no budget left for clinical output.

2. **Relevance noise** — sending all idioms for every narrative means a Shona consultation
   receives Swahili and Afrikaans idioms. Irrelevant idioms waste tokens and can confuse output.

**RAG solves both**: retrieve only the top-K idioms relevant to *this* narrative.

---

## Current State: Phase 1 — Human-in-the-Loop Submission

```
Clinician encounters idiom
        ↓
IdiomSubmissionDialog (UI) → idiom_submissions (Supabase table)
        ↓ status: pending_review
Expert panel reviews (manual — see Panel Review Process below)
        ↓ status: approved / rejected
Developer adds to src/lib/culturalIdioms.ts
        ↓
Next process-narrative call includes new idiom in system prompt
```

### Panel Review Process (current — manual)

There is no in-app review UI yet. The current workflow:

1. Submissions accumulate in `idiom_submissions` table (`status: pending_review`)
2. Export from Supabase Dashboard → Table Editor → `idiom_submissions` → Export CSV
3. Share CSV with Walter Mangezi + psychiatrist panel for review
4. Panel returns approved/rejected decisions
5. Developer manually updates `status` in Supabase and adds approved entries to `culturalIdioms.ts`
   with `validation_status: "panel_reviewed"`

**What's not built yet (future):**
- In-app admin review UI with approve/reject buttons
- Email notification when new submissions arrive
- Automatic `culturalIdioms.ts` update on approval

This is acceptable for the RFP timeline. A proper review UI is planned for Phase 2.

**When to stay in Phase 1:** Up to ~80 validated idioms.
**Trigger for Phase 2:** When `generateIdiomsPromptSection()` exceeds ~2,500 tokens,
or when the panel has reviewed ≥80 submissions.

---

## Phase 2 — Database-Backed Idiom Store (no RAG yet)

Move idioms from the `.ts` file into a Supabase table, loaded at request time.

```sql
CREATE TABLE public.cultural_idioms (
  id TEXT PRIMARY KEY,               -- matches CulturalIdiom.id in current .ts
  idiom TEXT NOT NULL,
  language_code TEXT NOT NULL,       -- BCP-47
  literal_translation TEXT,
  cultural_meaning TEXT NOT NULL,
  clinical_interpretations JSONB,    -- array of ClinicalInterpretation objects
  crisis_indicator BOOLEAN DEFAULT false,
  do_not_pathologize BOOLEAN DEFAULT false,
  clinical_probe TEXT,
  related_idioms TEXT[],
  validation_status TEXT DEFAULT 'unvalidated'
    CHECK (validation_status IN ('unvalidated','provisional','panel_reviewed','validated')),
  source_submission_id UUID REFERENCES public.idiom_submissions(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Benefit:** Admin panel can approve a submission and it goes live immediately —
no developer deploy required.

**Still loads all idioms into prompt** — Phase 3 solves the token problem.

---

## Phase 3 — RAG (Retrieval-Augmented Generation)

**Trigger:** ≥150 validated idioms OR system prompt token budget consistently exceeded.

### Option A: pgvector in Supabase (recommended — no new infrastructure)

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to cultural_idioms
ALTER TABLE public.cultural_idioms
  ADD COLUMN embedding vector(1536); -- OpenAI text-embedding-3-small dimensions
                                     -- or 1024 for Voyage AI voyage-3 (Anthropic's recommended embedder)
```

**Embedding model recommendation:** [Voyage AI `voyage-3`](https://www.voyageai.com/) —
Anthropic's recommended embedding partner. Better retrieval quality than OpenAI embeddings
for domain-specific text. API compatible, similar pricing.

```sql
-- Similarity search function
CREATE OR REPLACE FUNCTION match_idioms(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 8
)
RETURNS TABLE (
  id TEXT,
  idiom TEXT,
  language_code TEXT,
  cultural_meaning TEXT,
  clinical_interpretations JSONB,
  crisis_indicator BOOLEAN,
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.id, ci.idiom, ci.language_code, ci.cultural_meaning,
    ci.clinical_interpretations, ci.crisis_indicator,
    1 - (ci.embedding <=> query_embedding) AS similarity
  FROM public.cultural_idioms ci
  WHERE ci.validation_status IN ('panel_reviewed', 'validated')
    AND 1 - (ci.embedding <=> query_embedding) > match_threshold
  ORDER BY ci.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### The retrieval flow in `process-narrative`

```typescript
// 1. Embed the incoming narrative
const narrativeEmbedding = await embedText(narrative); // Voyage AI or OpenAI

// 2. Retrieve top-8 relevant idioms from Supabase
const { data: relevantIdioms } = await supabaseAdmin
  .rpc('match_idioms', {
    query_embedding: narrativeEmbedding,
    match_threshold: 0.70,
    match_count: 8,
  });

// 3. Inject only retrieved idioms into system prompt
// replaces current generateIdiomsPromptSection() which embeds all idioms
const idiomSection = buildIdiomPromptSection(relevantIdioms);

// 4. Call Claude with lean, targeted prompt
const response = await claudeApi({ system: baseSystemPrompt + idiomSection, ... });
```

**Token budget impact:**
- Before RAG: all 150 idioms ≈ 5,000 tokens
- After RAG: top-8 idioms ≈ 400 tokens
- Savings: ~4,600 tokens per request — enough headroom for richer clinical output

### Option B: Dedicated vector store (not recommended at this scale)

Pinecone, Weaviate, Chroma — overkill at <500 idioms and adds infrastructure dependency.
Revisit only if idiom library exceeds 1,000 entries.

---

## Phase 4 — Automated Validation Assist (future, post-funding)

Expert panel review remains the human gate, but AI assists by:

1. **Pre-screening submissions** — Claude checks for PII, assesses clinical plausibility,
   suggests ICD-11/ICD-10 codes as a starting point for the panel.

2. **Cross-reference checker** — flags if a submitted idiom is similar to an existing entry
   (cosine similarity ≥ 0.90), preventing duplicates.

3. **Frequency triage** — submissions appearing in >10 clinician encounters surface first
   in the review queue.

**Critical constraint:** Automated suggestion never bypasses panel approval.
The clinical interpretation and crisis_indicator flag are always human-set.
This is a SaMD regulatory requirement — adaptive algorithms modifying clinical logic
without human review require additional regulatory justification.

---

## Embedding Strategy for New Idioms

When an idiom is approved and moved to the `cultural_idioms` table:

```typescript
// Text to embed — combine idiom + meaning for richer retrieval
const textToEmbed = [
  idiom.idiom,
  idiom.literal_translation,
  idiom.cultural_meaning,
  idiom.clinical_interpretations.map(i => i.interpretation).join('. '),
].filter(Boolean).join(' | ');

const embedding = await voyageAI.embed(textToEmbed);
await supabase
  .from('cultural_idioms')
  .update({ embedding })
  .eq('id', idiom.id);
```

---

## Decision Checkpoints

| Milestone | Action |
|-----------|--------|
| 80 validated idioms | Migrate to Phase 2 (DB-backed store) |
| 150 validated idioms | Implement Phase 3 (pgvector RAG) |
| Panel review taking >2 weeks per submission | Implement Phase 4 assist |
| >1,000 idioms | Re-evaluate vector store options |

---

## Files Involved

| File | Role |
|------|------|
| `src/lib/culturalIdioms.ts` | Phase 1 — source of truth for validated idioms |
| `src/components/IdiomSubmissionDialog.tsx` | Phase 1 — clinician submission UI |
| `supabase/migrations/20260303161000_add_idiom_submissions.sql` | Phase 1 — submissions table |
| `supabase/functions/process-narrative/index.ts` | Will be updated in each phase |
| `supabase/migrations/[future]_add_cultural_idioms_table.sql` | Phase 2 |
| `supabase/migrations/[future]_add_idiom_embeddings.sql` | Phase 3 |

---

*Authored: March 2026*
*Next review trigger: When validated idiom count reaches 80*
