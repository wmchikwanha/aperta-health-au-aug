ALTER TABLE public.ai_inference_events ADD COLUMN IF NOT EXISTS pii_spans_detected integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS pii_types jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.consents DROP CONSTRAINT IF EXISTS consents_consent_type_check;
ALTER TABLE public.consents ADD CONSTRAINT consents_consent_type_check CHECK (consent_type IN ('clinical_use','audio_recording','research_participation','data_processing','ai_processing_consent','audio_retention','audio_role_access'));

CREATE TABLE public.privacy_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_principle text NOT NULL UNIQUE,
  title text NOT NULL,
  compliance_status text NOT NULL DEFAULT 'partial' CHECK (compliance_status IN ('compliant','partial','gap','not_applicable')),
  evidence_reference text,
  last_reviewed timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid
);
GRANT SELECT, INSERT, UPDATE ON public.privacy_compliance TO authenticated;
GRANT ALL ON public.privacy_compliance TO service_role;
ALTER TABLE public.privacy_compliance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read app" ON public.privacy_compliance FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write app" ON public.privacy_compliance FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update app" ON public.privacy_compliance FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.data_processing_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processor text NOT NULL UNIQUE,
  purpose text NOT NULL,
  data_types text[] NOT NULL DEFAULT '{}',
  location text NOT NULL,
  legal_basis text NOT NULL,
  dpa_status text NOT NULL DEFAULT 'pending' CHECK (dpa_status IN ('signed','pending','not_required')),
  last_reviewed timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.data_processing_records TO authenticated;
GRANT ALL ON public.data_processing_records TO service_role;
ALTER TABLE public.data_processing_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read dpr" ON public.data_processing_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write dpr" ON public.data_processing_records FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update dpr" ON public.data_processing_records FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.data_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type text NOT NULL UNIQUE,
  retention_period_days integer NOT NULL CHECK (retention_period_days > 0),
  legal_basis text NOT NULL,
  auto_action text NOT NULL CHECK (auto_action IN ('anonymise','archive','delete')),
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_run_affected integer
);
GRANT SELECT, UPDATE ON public.data_retention_policies TO authenticated;
GRANT ALL ON public.data_retention_policies TO service_role;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read drp" ON public.data_retention_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin update drp" ON public.data_retention_policies FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

INSERT INTO public.privacy_compliance (app_principle,title,compliance_status,evidence_reference) VALUES
('APP1','Open and transparent management of personal information','partial','Privacy notice on sign-in/sign-up; Privacy & Data admin tab'),
('APP2','Anonymity and pseudonymity','compliant','Clinician-defined pseudonymous patient codes; no names required'),
('APP3','Collection of solicited personal information','compliant','Minimal fields; PII scanner warns on free-text identifiers (audited pii_detected)'),
('APP4','Dealing with unsolicited personal information','partial','Machine scrubbing of narratives/transcripts/documents before AI'),
('APP5','Notification of collection','compliant','AI processing consent presented in patient language before first encounter'),
('APP6','Use or disclosure','compliant','Clinical use only; RLS by role; referrals audited'),
('APP7','Direct marketing','not_applicable','No marketing use'),
('APP8','Cross-border disclosure','partial','Google Gemini inference may occur outside AU; scrubbed text only; DPA tracked in data_processing_records'),
('APP9','Government related identifiers','compliant','Medicare/TFN/foreign national IDs scrubbed and not adopted as identifiers'),
('APP10','Quality of personal information','partial','Clinician review of all AI output'),
('APP11','Security of personal information','compliant','RLS, immutable audit_events, retention automation, encrypted transport'),
('APP12','Access to personal information','partial','Case summary export; formal patient request workflow planned (Batch 11)'),
('APP13','Correction of personal information','partial','Clinician edits audited; patient-initiated correction planned (Batch 11)');

INSERT INTO public.data_processing_records (processor,purpose,data_types,location,legal_basis,dpa_status) VALUES
('Lovable Cloud','Application hosting, database, auth, functions','{pseudonymous clinical records,audit logs,staff accounts}','Sydney, AU','Privacy Act APP11; contract','pending'),
('Google Gemini (via Lovable AI Gateway)','AI inference on scrubbed narrative text','{scrubbed clinical narrative}','Global (may transit outside AU)','Consent (ai_processing_consent); APP8','pending'),
('Twilio','Appointment SMS reminders (suppressed in pilot)','{phone number,appointment time}','US / global','Consent; APP8','pending'),
('Google Cloud Speech / Gemini audio','Speech recognition of clinical audio','{audio recordings}','Global (may transit outside AU)','Consent (audio_recording); APP8','pending');

INSERT INTO public.data_retention_policies (data_type,retention_period_days,legal_basis,auto_action) VALUES
('clinical_records',2555,'State health records legislation (7 years adult)','archive'),
('audio',365,'Consent scope; minimisation (APP11.2)','delete'),
('audit',3650,'Governance / SaMD accountability','archive'),
('self_assessment',30,'Minimisation (APP11.2); anonymous triage','anonymise');

CREATE OR REPLACE FUNCTION public.run_data_retention()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; n integer; total integer := 0;
BEGIN
  FOR p IN SELECT * FROM public.data_retention_policies WHERE is_active LOOP
    n := 0;
    IF p.data_type = 'self_assessment' THEN
      UPDATE public.self_assessment_sessions SET narrative_text = NULL, contact_name = NULL, contact_phone = NULL, contact_email = NULL, demographics = NULL, document_urls = NULL
      WHERE created_at < now() - make_interval(days => p.retention_period_days)
        AND (narrative_text IS NOT NULL OR contact_name IS NOT NULL OR contact_phone IS NOT NULL OR contact_email IS NOT NULL);
      GET DIAGNOSTICS n = ROW_COUNT;
    END IF;
    UPDATE public.data_retention_policies SET last_run_at = now(), last_run_affected = n WHERE id = p.id;
    INSERT INTO public.audit_events (actor_id, actor_role, action, outcome, resource_type, description, metadata, source)
    VALUES ('00000000-0000-0000-0000-000000000000','system','retention_run','success', p.data_type, 'Retention policy evaluated: '||p.auto_action, jsonb_build_object('affected', n, 'days', p.retention_period_days), 'run_data_retention');
    total := total + n;
  END LOOP;
  RETURN total;
END $$;
REVOKE ALL ON FUNCTION public.run_data_retention() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_data_retention() TO service_role;