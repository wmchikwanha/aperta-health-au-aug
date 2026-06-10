
-- Self Assessment Sessions (pseudonymous, no auth required)
CREATE TABLE public.self_assessment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'started',
  demographics jsonb DEFAULT '{}'::jsonb,
  location_region text,
  risk_level text,
  triage_result jsonb,
  narrative_text text,
  document_urls text[] DEFAULT '{}',
  language_code text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.self_assessment_sessions ENABLE ROW LEVEL SECURITY;

-- No public RLS policies — all access via service role in edge function
-- Admin read access for oversight
CREATE POLICY "Admins can view all self-assessment sessions"
  ON public.self_assessment_sessions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Self Assessment Consents
CREATE TABLE public.self_assessment_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.self_assessment_sessions(id) ON DELETE CASCADE,
  consent_type text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  consent_text_version text NOT NULL DEFAULT '1.0',
  language_code text NOT NULL DEFAULT 'en',
  ip_hash text,
  granted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.self_assessment_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all self-assessment consents"
  ON public.self_assessment_consents FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Self Assessment Responses (screening scores)
CREATE TABLE public.self_assessment_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.self_assessment_sessions(id) ON DELETE CASCADE,
  tool_type text NOT NULL,
  responses jsonb NOT NULL,
  total_score integer NOT NULL,
  severity_level text,
  interpretation text,
  item_flags jsonb DEFAULT '{}'::jsonb,
  completed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.self_assessment_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all self-assessment responses"
  ON public.self_assessment_responses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Facilities (mental health institutions)
CREATE TABLE public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_name text NOT NULL,
  region text NOT NULL,
  province text,
  city text,
  services_offered text[] DEFAULT '{}',
  contact_phone text,
  contact_email text,
  website text,
  operating_hours jsonb DEFAULT '{}'::jsonb,
  subscription_tier text NOT NULL DEFAULT 'basic',
  is_active boolean NOT NULL DEFAULT true,
  accepts_referrals boolean NOT NULL DEFAULT true,
  specialisations text[] DEFAULT '{}',
  emergency_capable boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

-- Anyone can read active facilities (public listing)
CREATE POLICY "Anyone can view active facilities"
  ON public.facilities FOR SELECT
  USING (is_active = true);

-- Only admins can manage facilities
CREATE POLICY "Admins can manage facilities"
  ON public.facilities FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Facility Referrals
CREATE TABLE public.facility_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.self_assessment_sessions(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id),
  status text NOT NULL DEFAULT 'pending',
  matched_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  sla_deadline timestamptz DEFAULT (now() + interval '48 hours'),
  escalated boolean NOT NULL DEFAULT false,
  escalation_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.facility_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all facility referrals"
  ON public.facility_referrals FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage facility referrals"
  ON public.facility_referrals FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_self_assessment_sessions_token ON public.self_assessment_sessions(session_token);
CREATE INDEX idx_self_assessment_sessions_status ON public.self_assessment_sessions(status);
CREATE INDEX idx_facilities_region ON public.facilities(region);
CREATE INDEX idx_facilities_active ON public.facilities(is_active, accepts_referrals);
CREATE INDEX idx_facility_referrals_session ON public.facility_referrals(session_id);
CREATE INDEX idx_facility_referrals_facility ON public.facility_referrals(facility_id);
CREATE INDEX idx_facility_referrals_status ON public.facility_referrals(status);

-- Updated_at triggers
CREATE TRIGGER update_facilities_updated_at
  BEFORE UPDATE ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_facility_referrals_updated_at
  BEFORE UPDATE ON public.facility_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
