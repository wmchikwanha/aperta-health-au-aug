ALTER TABLE public.diagnostic_formulations ADD COLUMN IF NOT EXISTS reasoning_trace jsonb;

CREATE TABLE public.ai_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_output_id text,
  function_name text NOT NULL,
  patient_id uuid,
  reviewer_id uuid NOT NULL,
  reviewer_role text,
  decision text NOT NULL CHECK (decision IN ('accepted','modified','rejected')),
  override_reason text,
  modified_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  original_suggestion jsonb,
  final_content jsonb,
  review_time_ms integer,
  language_of_encounter text,
  model_id text,
  model_version_id uuid,
  prompt_template_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_reviews_reason_required CHECK (decision = 'accepted' OR length(coalesce(trim(override_reason), '')) >= 3)
);
GRANT SELECT, INSERT ON public.ai_reviews TO authenticated;
GRANT ALL ON public.ai_reviews TO service_role;
ALTER TABLE public.ai_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviewers insert own reviews" ON public.ai_reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "Reviewers read own, admins read all" ON public.ai_reviews FOR SELECT TO authenticated USING (reviewer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_ai_reviews_function ON public.ai_reviews(function_name, created_at DESC);