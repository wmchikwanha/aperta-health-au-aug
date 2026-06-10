-- idiom_submissions: Clinician-submitted cultural idioms pending expert panel review
-- Phase 1 of the Nzwisiso idiom learning pipeline
-- See docs/idiom-rag-architecture.md for the full future RAG architecture plan

CREATE TABLE public.idiom_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The idiom
  idiom TEXT NOT NULL,
  language_code TEXT NOT NULL, -- BCP-47: sn, nd, zu, xh, st, af, sw, en

  -- Clinical context — all content must be anonymised (no patient PII)
  patient_utterance TEXT NOT NULL,       -- What the patient said, verbatim, anonymised
  clinician_interpretation TEXT NOT NULL, -- Clinician's proposed clinical meaning
  clinical_context TEXT,                  -- Optional: presenting complaint / clinical setting

  -- Review workflow
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'under_review', 'approved', 'rejected')),
  reviewer_id UUID REFERENCES auth.users(id),
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,

  -- If approved: track which culturalIdioms.ts entry this became
  -- Maps to CulturalIdiom.id in src/lib/culturalIdioms.ts
  library_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.idiom_submissions IS
  'Clinician-submitted cultural idioms of distress awaiting expert panel review. '
  'No patient PII should be stored — patient_utterance must be anonymised. '
  'Approved entries are manually incorporated into src/lib/culturalIdioms.ts by a developer '
  'after psychiatrist panel sign-off. '
  'Future: entries will be vectorised into a pgvector store for RAG-based idiom retrieval. '
  'See docs/idiom-rag-architecture.md.';

COMMENT ON COLUMN public.idiom_submissions.patient_utterance IS
  'Verbatim (anonymised) quote of what the patient said. No names, dates, or locations.';
COMMENT ON COLUMN public.idiom_submissions.library_id IS
  'Set when approved — maps to CulturalIdiom.id in culturalIdioms.ts.';

-- Enable RLS
ALTER TABLE public.idiom_submissions ENABLE ROW LEVEL SECURITY;

-- Clinicians: submit and view their own submissions
CREATE POLICY "Clinicians can submit idioms"
  ON public.idiom_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Clinicians can view their own submissions"
  ON public.idiom_submissions
  FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

-- Admins: full access for review workflow
CREATE POLICY "Admins can view all submissions"
  ON public.idiom_submissions
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update submission status"
  ON public.idiom_submissions
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX idx_idiom_submissions_status ON public.idiom_submissions(status);
CREATE INDEX idx_idiom_submissions_submitted_by ON public.idiom_submissions(submitted_by);
CREATE INDEX idx_idiom_submissions_language ON public.idiom_submissions(language_code);

-- Auto-update updated_at
CREATE TRIGGER idiom_submissions_updated_at
  BEFORE UPDATE ON public.idiom_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
