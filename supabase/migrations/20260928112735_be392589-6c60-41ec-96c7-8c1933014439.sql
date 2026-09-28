CREATE TABLE public.rules_engine_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  effective_date date NOT NULL,
  scoring_logic_hash text NOT NULL,
  pathway_logic_hash text NOT NULL,
  mhgap_version text NOT NULL,
  instruments_version text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rules_engine_versions TO authenticated;
GRANT ALL ON public.rules_engine_versions TO service_role;

ALTER TABLE public.rules_engine_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rules versions"
ON public.rules_engine_versions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Administrators can add rules versions"
ON public.rules_engine_versions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Administrators can revise rules versions"
ON public.rules_engine_versions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_rules_engine_versions_updated_at
BEFORE UPDATE ON public.rules_engine_versions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.rules_engine_versions (
  id,
  version,
  effective_date,
  scoring_logic_hash,
  pathway_logic_hash,
  mhgap_version,
  instruments_version
) VALUES (
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '1.0.0-batch1',
  CURRENT_DATE,
  'sha256:aperta-clinical-rules-engine-1.0.0',
  'sha256:aperta-crisis-mhgap-ats-1.0.0',
  'mhGAP-IG-v2.0-2016',
  'PHQ9-1.0|GAD7-1.0|PCL5-DSM5|PSQ-1.0|PRIMER5-1.0|RHS15-2013|HTQIV-1.0|WHODAS12-2.0|SEWB-1.0'
);

ALTER TABLE public.screening_assessments
ADD COLUMN rules_version_id uuid REFERENCES public.rules_engine_versions(id)
DEFAULT 'b1000000-0000-4000-8000-000000000001'::uuid;

UPDATE public.screening_assessments
SET rules_version_id = 'b1000000-0000-4000-8000-000000000001'::uuid
WHERE rules_version_id IS NULL;

ALTER TABLE public.screening_assessments
ALTER COLUMN rules_version_id SET NOT NULL;

CREATE INDEX screening_assessments_rules_version_id_idx
ON public.screening_assessments(rules_version_id);