CREATE TABLE public.model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model_id text NOT NULL,
  model_version_label text NOT NULL,
  slot text NOT NULL CHECK (slot IN ('narrative','reasoning')),
  pinned_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','active','retired')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX model_versions_one_active_per_slot ON public.model_versions(slot) WHERE status = 'active';

CREATE TABLE public.ai_safety_preambles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  preamble_text text NOT NULL,
  preamble_hash text NOT NULL,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,
  created_by uuid,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ai_safety_preambles_one_current ON public.ai_safety_preambles(is_current) WHERE is_current;

CREATE TABLE public.prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL CHECK (function_name IN ('process-narrative','transcribe-audio','process-document','suggest-diagnosis','generate-treatment-plan','ask-ai','self-assess')),
  version text NOT NULL,
  model_slot text NOT NULL CHECK (model_slot IN ('narrative','reasoning')),
  system_prompt text NOT NULL,
  safety_preamble_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('candidate','active','retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (function_name, version)
);
CREATE UNIQUE INDEX prompt_templates_one_active ON public.prompt_templates(function_name) WHERE status = 'active';

CREATE TABLE public.ai_model_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version_id uuid REFERENCES public.model_versions(id),
  model_name text NOT NULL,
  model_version text NOT NULL,
  provider text NOT NULL,
  capabilities jsonb NOT NULL DEFAULT '[]',
  limitations jsonb NOT NULL DEFAULT '[]',
  intended_use text NOT NULL,
  out_of_scope_uses jsonb NOT NULL DEFAULT '[]',
  performance_metrics jsonb NOT NULL DEFAULT '{}',
  bias_assessment jsonb NOT NULL DEFAULT '{}',
  ethical_considerations text,
  training_data_summary text,
  last_updated timestamptz NOT NULL DEFAULT now(),
  reviewed_by text
);

CREATE TABLE public.golden_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  input_text text NOT NULL,
  language text NOT NULL,
  expected_output_schema jsonb NOT NULL DEFAULT '{}',
  expects_idiom_flag boolean NOT NULL DEFAULT false,
  clinician_reviewed boolean NOT NULL DEFAULT false,
  reviewer_id uuid,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.eval_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version_id uuid NOT NULL REFERENCES public.model_versions(id),
  prompt_template_id uuid REFERENCES public.prompt_templates(id),
  test_date timestamptz NOT NULL DEFAULT now(),
  eval_suite_version text NOT NULL,
  passed boolean NOT NULL,
  score jsonb NOT NULL DEFAULT '{}',
  run_by uuid
);

CREATE TABLE public.ai_confidence_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  patient_id uuid,
  encounter_id uuid,
  raw_confidence numeric,
  calibrated_confidence numeric,
  clinician_override boolean NOT NULL DEFAULT false,
  clinician_override_reason text CHECK (clinician_override_reason IS NULL OR clinician_override_reason IN ('AI missed cultural context','AI incorrect','Patient preference','Local guidelines differ','Translation issue','Other')),
  override_note text,
  language_of_input text,
  model_version_id uuid,
  prompt_template_id uuid,
  clinician_id uuid DEFAULT auth.uid(),
  error boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_drift_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  language text NOT NULL DEFAULT 'all',
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  avg_confidence numeric,
  override_rate numeric,
  error_rate numeric,
  total_invocations integer NOT NULL DEFAULT 0,
  language_breakdown jsonb NOT NULL DEFAULT '{}',
  flagged boolean NOT NULL DEFAULT false,
  flag_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (function_name, language, period_start)
);

GRANT SELECT ON public.model_versions, public.ai_safety_preambles, public.prompt_templates, public.ai_model_cards, public.golden_cases, public.eval_results TO authenticated;
GRANT INSERT, UPDATE ON public.model_versions, public.ai_safety_preambles, public.prompt_templates, public.ai_model_cards, public.golden_cases TO authenticated;
GRANT SELECT, INSERT ON public.ai_confidence_log TO authenticated;
GRANT SELECT ON public.ai_drift_metrics TO authenticated;
GRANT ALL ON public.model_versions, public.ai_safety_preambles, public.prompt_templates, public.ai_model_cards, public.golden_cases, public.eval_results, public.ai_confidence_log, public.ai_drift_metrics TO service_role;

ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_safety_preambles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golden_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eval_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_confidence_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_drift_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read models" ON public.model_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert models" ON public.model_versions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND status = 'candidate');
CREATE POLICY "Admins retire models" ON public.model_versions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin') AND status IN ('candidate','retired'));

CREATE POLICY "Authenticated read preambles" ON public.ai_safety_preambles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins write preambles" ON public.ai_safety_preambles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update preambles" ON public.ai_safety_preambles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Authenticated read prompts" ON public.prompt_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins write prompts" ON public.prompt_templates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND status = 'candidate');
CREATE POLICY "Admins update prompts" ON public.prompt_templates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin') AND status IN ('candidate','retired'));

CREATE POLICY "Authenticated read model cards" ON public.ai_model_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins write model cards" ON public.ai_model_cards FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update model cards" ON public.ai_model_cards FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Authenticated read golden" ON public.golden_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins write golden" ON public.golden_cases FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update golden" ON public.golden_cases FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Authenticated read evals" ON public.eval_results FOR SELECT TO authenticated USING (true);

CREATE POLICY "Clinicians log confidence" ON public.ai_confidence_log FOR INSERT TO authenticated WITH CHECK (clinician_id = auth.uid());
CREATE POLICY "Own or admin read confidence" ON public.ai_confidence_log FOR SELECT TO authenticated USING (clinician_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins read drift" ON public.ai_drift_metrics FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER model_versions_updated_at BEFORE UPDATE ON public.model_versions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.promote_model_version(_model_version_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller uuid := auth.uid();
  _mv record;
  _latest record;
  _previous uuid;
BEGIN
  IF _caller IS NULL OR NOT public.has_role(_caller,'admin') THEN
    RAISE EXCEPTION 'Only administrators can promote models';
  END IF;
  SELECT * INTO _mv FROM public.model_versions WHERE id = _model_version_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Model version not found'; END IF;
  IF _mv.status <> 'candidate' THEN RAISE EXCEPTION 'Only candidate models can be promoted'; END IF;
  SELECT * INTO _latest FROM public.eval_results WHERE model_version_id = _model_version_id ORDER BY test_date DESC LIMIT 1;
  IF NOT FOUND OR NOT _latest.passed THEN
    RAISE EXCEPTION 'Promotion blocked: latest regression run has not passed';
  END IF;
  SELECT id INTO _previous FROM public.model_versions WHERE slot = _mv.slot AND status = 'active';
  UPDATE public.model_versions SET status = 'retired' WHERE slot = _mv.slot AND status = 'active';
  UPDATE public.model_versions SET status = 'active', pinned_at = now() WHERE id = _model_version_id;
  INSERT INTO public.audit_events (actor_id, actor_role, action, outcome, resource_type, resource_id, description, metadata, source)
  VALUES (_caller, 'admin', 'model_promoted', 'success', 'model_version', _model_version_id::text,
    'Promoted ' || _mv.model_id || ' to active for ' || _mv.slot || ' slot',
    jsonb_build_object('previous_model_version_id', _previous, 'eval_result_id', _latest.id, 'slot', _mv.slot), 'promote_model_version');
  RETURN _model_version_id;
END; $$;
REVOKE ALL ON FUNCTION public.promote_model_version(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_model_version(uuid) TO authenticated;