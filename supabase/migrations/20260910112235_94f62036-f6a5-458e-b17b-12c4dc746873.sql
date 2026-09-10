-- 1. pilot_config
CREATE TABLE public.pilot_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pilot_mode boolean NOT NULL DEFAULT true,
  allow_real_data boolean NOT NULL DEFAULT false,
  pilot_version text NOT NULL DEFAULT 'v1.0-pilot',
  pilot_end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pilot_config TO authenticated;
GRANT SELECT ON public.pilot_config TO anon;
GRANT ALL ON public.pilot_config TO service_role;
ALTER TABLE public.pilot_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pilot config" ON public.pilot_config FOR SELECT USING (true);
CREATE POLICY "Admins manage pilot config" ON public.pilot_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER pilot_config_updated_at BEFORE UPDATE ON public.pilot_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.pilot_config (pilot_mode, allow_real_data, pilot_version, pilot_end_date)
VALUES (true, false, 'v1.0-pilot', (current_date + interval '180 days')::date);

-- 2. synthetic + provenance + audit columns
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS synthetic boolean NOT NULL DEFAULT true;
ALTER TABLE public.chw_sessions ADD COLUMN IF NOT EXISTS synthetic boolean NOT NULL DEFAULT true;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS synthetic boolean NOT NULL DEFAULT true;
ALTER TABLE public.screening_assessments ADD COLUMN IF NOT EXISTS synthetic boolean NOT NULL DEFAULT true;

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.chw_sessions ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.screening_assessments ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.treatment_notes ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.treatment_notes ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TRIGGER assessments_updated_at BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER treatment_notes_updated_at BEFORE UPDATE ON public.treatment_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS model_id text,
  ADD COLUMN IF NOT EXISTS model_version text,
  ADD COLUMN IF NOT EXISTS prompt_template_id text,
  ADD COLUMN IF NOT EXISTS prompt_template_version text,
  ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS provenance jsonb;
ALTER TABLE public.diagnostic_formulations
  ADD COLUMN IF NOT EXISTS model_id text,
  ADD COLUMN IF NOT EXISTS model_version text,
  ADD COLUMN IF NOT EXISTS prompt_template_id text,
  ADD COLUMN IF NOT EXISTS prompt_template_version text,
  ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS provenance jsonb;
ALTER TABLE public.treatment_notes
  ADD COLUMN IF NOT EXISTS model_id text,
  ADD COLUMN IF NOT EXISTS model_version text,
  ADD COLUMN IF NOT EXISTS prompt_template_id text,
  ADD COLUMN IF NOT EXISTS prompt_template_version text,
  ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS provenance jsonb;

-- 3. force synthetic while pilot mode is on
CREATE OR REPLACE FUNCTION public.enforce_pilot_synthetic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.pilot_config WHERE pilot_mode = true) THEN
    NEW.synthetic := true;
  END IF;
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER patients_pilot_synthetic BEFORE INSERT ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pilot_synthetic();
CREATE TRIGGER chw_sessions_pilot_synthetic BEFORE INSERT ON public.chw_sessions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pilot_synthetic();
CREATE TRIGGER assessments_pilot_synthetic BEFORE INSERT ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pilot_synthetic();
CREATE TRIGGER screening_assessments_pilot_synthetic BEFORE INSERT ON public.screening_assessments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pilot_synthetic();

-- 4. immutability of clinical records for client roles
REVOKE UPDATE, DELETE ON public.assessments FROM authenticated, anon;
REVOKE UPDATE, DELETE ON public.screening_assessments FROM authenticated, anon;
REVOKE UPDATE, DELETE ON public.treatment_notes FROM authenticated, anon;
REVOKE UPDATE, DELETE ON public.audit_events FROM authenticated, anon;
REVOKE UPDATE, DELETE ON public.consents FROM authenticated, anon;
GRANT ALL ON public.assessments TO service_role;
GRANT ALL ON public.screening_assessments TO service_role;
GRANT ALL ON public.treatment_notes TO service_role;
GRANT ALL ON public.audit_events TO service_role;
GRANT ALL ON public.consents TO service_role;

-- 5. admin-only demo reset
CREATE OR REPLACE FUNCTION public.reset_demo_data()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller uuid := auth.uid();
  _pid uuid;
  _seeded integer := 0;
  _rec record;
BEGIN
  IF _caller IS NULL OR NOT public.has_role(_caller, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only administrators can reset demo data';
  END IF;

  DELETE FROM public.screening_assessments s
    USING public.patients p WHERE s.patient_id = p.id AND p.synthetic = true;
  DELETE FROM public.treatment_notes t
    USING public.patients p WHERE t.patient_id = p.id AND p.synthetic = true;
  DELETE FROM public.diagnostic_formulations d
    USING public.patients p WHERE d.patient_id = p.id AND p.synthetic = true;
  DELETE FROM public.assessments a
    USING public.patients p WHERE a.patient_id = p.id AND p.synthetic = true;
  DELETE FROM public.crisis_interventions c
    USING public.patients p WHERE c.patient_id = p.id AND p.synthetic = true;
  DELETE FROM public.appointments ap
    USING public.patients p WHERE ap.patient_id = p.id AND p.synthetic = true;
  DELETE FROM public.referrals r
    USING public.patients p WHERE r.patient_id = p.id AND p.synthetic = true;
  DELETE FROM public.consents co
    USING public.patients p WHERE co.patient_id = p.id AND p.synthetic = true;
  DELETE FROM public.audit_events ae
    USING public.patients p WHERE ae.patient_id = p.id AND p.synthetic = true;
  DELETE FROM public.patients WHERE synthetic = true AND patient_identifier LIKE 'DEMO-%';

  FOR _rec IN
    SELECT * FROM (VALUES
      ('DEMO-AR-01','ar','Arabic','Sleep loss and intrusive memories since arrival; describes "my chest is tight" (dheeq nafas) when recalling checkpoint detention.', 14, 0),
      ('DEMO-AR-02','ar','Arabic','Separated from two children still overseas; constant worry, poor appetite, says "my heart is burning" describing grief rather than cardiac symptoms.', 11, 0),
      ('DEMO-AR-03','ar','Arabic','CRISIS CASE: reports hopelessness and states she would be better off gone; PHQ-9 item 9 endorsed. Requires immediate safety response.', 22, 2),
      ('DEMO-FA-01','fa','Farsi','Ongoing nightmares of boat journey, avoids water, hypervigilant in crowds. High trauma load, PCL-5 elevated.', 16, 0),
      ('DEMO-FA-02','fa','Dari','Visa uncertainty driving anxiety and insomnia; family shame concerns limit help-seeking.', 12, 0),
      ('DEMO-FA-03','fa','Dari','Somatic presentation: headaches and body pain with low mood; describes "fishar" (pressure) as idiom of distress.', 9, 0),
      ('DEMO-MY-01','my','Burmese','Camp-based trauma, low mood, withdrawn from community; interpreter-assisted session.', 13, 0),
      ('DEMO-MY-02','my','Burmese','SAFEGUARDING SCENARIO: discloses concerns about a child in the household being unsafe; mandatory reporting pathway required.', 10, 0),
      ('DEMO-TI-01','ti','Tigrinya','Torture survivor; startle response and dissociative episodes described during narrative.', 18, 0),
      ('DEMO-TI-02','ti','Tigrinya','Grief following bereavement in transit; culturally normative mourning rather than disorder.', 6, 0),
      ('DEMO-SW-01','sw','Swahili','Chronic worry about resettlement paperwork; functional impairment at English classes.', 10, 0),
      ('DEMO-SW-02','sw','Swahili','Alcohol use increasing since arrival; discloses using to sleep.', 8, 0),
      ('DEMO-VI-01','vi','Vietnamese','Older client with social isolation and low mood; limited English, family interpreting.', 7, 0),
      ('DEMO-TA-01','ta','Tamil','CODE-SWITCHING NARRATIVE: alternates Tamil and English mid-sentence when describing panic episodes.', 12, 0),
      ('DEMO-EN-01','en','English','ATSI SEWB NARRATIVE: Aboriginal client describing disconnection from Country and kinship obligations alongside low mood.', 11, 0)
    ) AS t(ident, lang, langlabel, narrative, phq, item9)
  LOOP
    INSERT INTO public.patients (user_id, patient_identifier, language_preference, cultural_background, metadata, synthetic, created_by)
    VALUES (
      _caller, _rec.ident, _rec.lang, _rec.langlabel,
      jsonb_build_object(
        'demo', true,
        'age_band', '26-35',
        'atsi_identifies', (_rec.ident = 'DEMO-EN-01'),
        'atsi_identity_label', CASE WHEN _rec.ident = 'DEMO-EN-01' THEN 'Aboriginal' ELSE NULL END
      ),
      true, _caller
    )
    RETURNING id INTO _pid;

    INSERT INTO public.assessments (patient_id, user_id, narrative, processed_result, assessment_date, language_detected, risk_level, metadata, synthetic, created_by, ai_generated)
    VALUES (
      _pid, _caller, _rec.narrative,
      jsonb_build_object('pending', true, 'note', 'Synthetic pilot narrative — awaiting clinician processing.'),
      now() - (random() * interval '20 days'),
      _rec.lang,
      CASE WHEN _rec.item9 > 0 THEN 'high' WHEN _rec.phq >= 15 THEN 'moderate' ELSE 'low' END,
      jsonb_build_object('demo', true),
      true, _caller, false
    );

    INSERT INTO public.screening_assessments (patient_id, user_id, tool_type, responses, total_score, severity_level, interpretation, administered_at, synthetic, created_by)
    VALUES (
      _pid, _caller, 'PHQ-9',
      jsonb_build_object('item9', _rec.item9, 'seeded', true),
      _rec.phq,
      CASE WHEN _rec.phq >= 20 THEN 'severe' WHEN _rec.phq >= 15 THEN 'moderately-severe'
           WHEN _rec.phq >= 10 THEN 'moderate' WHEN _rec.phq >= 5 THEN 'mild' ELSE 'minimal' END,
      'Synthetic pilot screening record.',
      now() - (random() * interval '20 days'),
      true, _caller
    );

    _seeded := _seeded + 1;
  END LOOP;

  INSERT INTO public.audit_events (actor_id, actor_role, action, outcome, resource_type, description, metadata, source)
  VALUES (_caller, 'admin', 'demo_data_reset', 'success', 'pilot_config',
          'Demo data cleared and reseeded with synthetic pilot clients.',
          jsonb_build_object('seeded', _seeded), 'reset_demo_data');

  RETURN _seeded;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_demo_data() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reset_demo_data() TO authenticated;