CREATE TABLE public.ai_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by uuid,
  source text NOT NULL DEFAULT 'clinician' CHECK (source IN ('clinician','system')),
  incident_type text NOT NULL CHECK (incident_type IN ('hallucination','wrong_formulation','missed_crisis_cue','injection_attempt','output_validation_failure','unsafe_content','cultural_misinterpretation','translation_error','other')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  function_name text,
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 4000),
  linked_ai_output_id text,
  linked_patient_id uuid,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','capa','closed')),
  capa_notes text,
  reviewer_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.ai_incidents TO authenticated;
GRANT ALL ON public.ai_incidents TO service_role;
ALTER TABLE public.ai_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinicians report incidents" ON public.ai_incidents FOR INSERT TO authenticated
  WITH CHECK (reported_by = auth.uid() AND source = 'clinician' AND status = 'open' AND reviewer_id IS NULL AND capa_notes IS NULL);
CREATE POLICY "Own or admin read incidents" ON public.ai_incidents FOR SELECT TO authenticated
  USING (reported_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage incidents" ON public.ai_incidents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER ai_incidents_updated_at BEFORE UPDATE ON public.ai_incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ai_inference_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  actor_id uuid,
  model_id text,
  prompt_template_id uuid,
  schema_valid boolean NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  injection_detected boolean NOT NULL DEFAULT false,
  injection_patterns jsonb NOT NULL DEFAULT '[]',
  dosage_blocked boolean NOT NULL DEFAULT false,
  cultural_flags jsonb NOT NULL DEFAULT '[]',
  failure_reason text,
  input_chars integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_inference_events TO authenticated;
GRANT ALL ON public.ai_inference_events TO service_role;
ALTER TABLE public.ai_inference_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read inference events" ON public.ai_inference_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.red_team_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL DEFAULT 'process-narrative',
  input_text text NOT NULL,
  language text NOT NULL,
  attack_type text NOT NULL,
  forbidden_strings jsonb NOT NULL DEFAULT '[]',
  expected_output_schema jsonb NOT NULL DEFAULT '{}',
  adversarial boolean NOT NULL DEFAULT true,
  clinician_reviewed boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.red_team_cases TO authenticated;
GRANT ALL ON public.red_team_cases TO service_role;
ALTER TABLE public.red_team_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read red team" ON public.red_team_cases FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins write red team" ON public.red_team_cases FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update red team" ON public.red_team_cases FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.cultural_idioms (
  id text PRIMARY KEY,
  idiom text NOT NULL,
  language_code text NOT NULL,
  literal_translation text NOT NULL,
  match_terms text[] NOT NULL DEFAULT '{}',
  do_not_pathologise boolean NOT NULL DEFAULT false,
  guidance text,
  validation_status text NOT NULL DEFAULT 'provisional',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.cultural_idioms TO authenticated;
GRANT ALL ON public.cultural_idioms TO service_role;
ALTER TABLE public.cultural_idioms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read idioms" ON public.cultural_idioms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins write idioms" ON public.cultural_idioms FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update idioms" ON public.cultural_idioms FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER cultural_idioms_updated_at BEFORE UPDATE ON public.cultural_idioms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.public_rate_limits (
  bucket text NOT NULL,
  key_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, key_hash, window_start)
);
GRANT ALL ON public.public_rate_limits TO service_role;
ALTER TABLE public.public_rate_limits ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.prompt_templates ADD COLUMN IF NOT EXISTS max_input_chars integer NOT NULL DEFAULT 30000;
ALTER TABLE public.patient_intake_sessions ADD COLUMN IF NOT EXISTS token_used_at timestamptz;

CREATE OR REPLACE FUNCTION public.check_rate_limit(_bucket text, _key_hash text, _limit integer, _window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _start timestamptz := to_timestamp(floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds);
  _hits integer;
BEGIN
  INSERT INTO public.public_rate_limits (bucket, key_hash, window_start, hits)
  VALUES (_bucket, _key_hash, _start, 1)
  ON CONFLICT (bucket, key_hash, window_start) DO UPDATE SET hits = public_rate_limits.hits + 1
  RETURNING hits INTO _hits;
  DELETE FROM public.public_rate_limits WHERE window_start < now() - interval '1 day';
  RETURN _hits <= _limit;
END; $$;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;