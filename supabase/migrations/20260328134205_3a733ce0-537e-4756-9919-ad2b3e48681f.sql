
-- Table 1: patient_intake_sessions
CREATE TABLE public.patient_intake_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  clinician_id uuid NOT NULL,
  clinic_code text,
  status text NOT NULL DEFAULT 'pending',
  tier text NOT NULL DEFAULT 'basic',
  language_code text NOT NULL DEFAULT 'en',
  demographics jsonb DEFAULT '{}'::jsonb,
  ai_intake_summary jsonb,
  risk_flags jsonb DEFAULT '{}'::jsonb,
  narrative_text text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  started_at timestamptz,
  completed_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table 2: patient_intake_responses
CREATE TABLE public.patient_intake_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.patient_intake_sessions(id) ON DELETE CASCADE,
  tool_type text NOT NULL,
  responses jsonb NOT NULL,
  total_score integer NOT NULL,
  severity_level text,
  interpretation text,
  item_flags jsonb DEFAULT '{}'::jsonb,
  completed_at timestamptz NOT NULL DEFAULT now()
);

-- Table 3: patient_intake_consents
CREATE TABLE public.patient_intake_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.patient_intake_sessions(id) ON DELETE CASCADE,
  consent_type text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  consent_text_version text NOT NULL DEFAULT '1.0',
  language_code text NOT NULL DEFAULT 'en',
  granted_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text
);

-- RLS: patient_intake_sessions
ALTER TABLE public.patient_intake_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinicians can view their intake sessions"
  ON public.patient_intake_sessions FOR SELECT TO authenticated
  USING (clinician_id = auth.uid());

CREATE POLICY "Admins can view all intake sessions"
  ON public.patient_intake_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clinicians can update their intake sessions"
  ON public.patient_intake_sessions FOR UPDATE TO authenticated
  USING (clinician_id = auth.uid());

CREATE POLICY "Clinicians can insert intake sessions"
  ON public.patient_intake_sessions FOR INSERT TO authenticated
  WITH CHECK (clinician_id = auth.uid());

-- RLS: patient_intake_responses
ALTER TABLE public.patient_intake_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinicians can view intake responses via session"
  ON public.patient_intake_responses FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patient_intake_sessions s
    WHERE s.id = patient_intake_responses.session_id
    AND s.clinician_id = auth.uid()
  ));

CREATE POLICY "Admins can view all intake responses"
  ON public.patient_intake_responses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: patient_intake_consents (immutable - no UPDATE/DELETE)
ALTER TABLE public.patient_intake_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinicians can view intake consents via session"
  ON public.patient_intake_consents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patient_intake_sessions s
    WHERE s.id = patient_intake_consents.session_id
    AND s.clinician_id = auth.uid()
  ));

CREATE POLICY "Admins can view all intake consents"
  ON public.patient_intake_consents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
