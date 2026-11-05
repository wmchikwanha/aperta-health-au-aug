CREATE TABLE public.snomed_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snomed_concept_id text NOT NULL,
  snomed_fsn text NOT NULL,
  snomed_preferred_term text NOT NULL,
  icd10am_code text,
  icd11_code text,
  dsm5tr_code text,
  diagnostic_category text NOT NULL,
  cultural_idiom_links text[] NOT NULL DEFAULT '{}',
  severity_qualifier text NOT NULL DEFAULT 'unspecified',
  is_active boolean NOT NULL DEFAULT true,
  source_edition text NOT NULL DEFAULT 'SNOMED CT-AU August 2026',
  mapped_by uuid,
  mapped_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  UNIQUE (snomed_concept_id, severity_qualifier)
);
CREATE INDEX snomed_mappings_icd10am_idx ON public.snomed_mappings(icd10am_code);
CREATE INDEX snomed_mappings_icd11_idx ON public.snomed_mappings(icd11_code);
CREATE INDEX snomed_mappings_cat_idx ON public.snomed_mappings(diagnostic_category);
GRANT SELECT, INSERT, UPDATE ON public.snomed_mappings TO authenticated;
GRANT ALL ON public.snomed_mappings TO service_role;
ALTER TABLE public.snomed_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "snomed read" ON public.snomed_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "snomed curate insert" ON public.snomed_mappings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'psychiatrist'));
CREATE POLICY "snomed curate update" ON public.snomed_mappings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'psychiatrist'));

CREATE TABLE public.diagnosis_crosswalk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  icd10am_code text NOT NULL UNIQUE,
  icd10am_title text NOT NULL,
  icd11_code text,
  icd11_uri text,
  dsm5tr_disorder_name text,
  dsm5tr_icd10cm_code text,
  mapping_status text NOT NULL DEFAULT 'approximate' CHECK (mapping_status IN ('exact','approximate','unmapped')),
  crosswalk_version text NOT NULL DEFAULT '1.0.0',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.diagnosis_crosswalk TO authenticated;
GRANT ALL ON public.diagnosis_crosswalk TO service_role;
ALTER TABLE public.diagnosis_crosswalk ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crosswalk read" ON public.diagnosis_crosswalk FOR SELECT TO authenticated USING (true);
CREATE POLICY "crosswalk admin insert" ON public.diagnosis_crosswalk FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "crosswalk admin update" ON public.diagnosis_crosswalk FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.terminology_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_type text NOT NULL CHECK (submission_type IN ('idiom_mapping','flag_incorrect')),
  snomed_mapping_id uuid REFERENCES public.snomed_mappings(id),
  idiom text,
  language_code text,
  proposed_snomed_concept_id text,
  comment text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','rejected')),
  submitted_by uuid NOT NULL DEFAULT auth.uid(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.terminology_submissions TO authenticated;
GRANT ALL ON public.terminology_submissions TO service_role;
ALTER TABLE public.terminology_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "termsub read" ON public.terminology_submissions FOR SELECT TO authenticated
  USING (submitted_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'psychiatrist'));
CREATE POLICY "termsub insert" ON public.terminology_submissions FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'psychiatrist')));
CREATE POLICY "termsub review" ON public.terminology_submissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'psychiatrist'));

ALTER TABLE public.diagnostic_formulations
  ADD COLUMN IF NOT EXISTS snomed_concept_id text,
  ADD COLUMN IF NOT EXISTS icd10am_release_version text DEFAULT 'ICD-10-AM 12th Edition (2024)',
  ADD COLUMN IF NOT EXISTS dsm_version text NOT NULL DEFAULT 'DSM-5-TR',
  ADD COLUMN IF NOT EXISTS terminology_version text DEFAULT 'SNOMED CT-AU August 2026';