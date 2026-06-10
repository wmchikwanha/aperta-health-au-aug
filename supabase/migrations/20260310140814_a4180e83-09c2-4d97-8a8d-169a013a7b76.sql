-- ============================================
-- 1. AUDIT EVENTS TABLE
-- ============================================
CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id UUID NOT NULL,
  actor_role TEXT NOT NULL
    CHECK (actor_role IN ('clinician', 'admin', 'system', 'supervisor')),
  action TEXT NOT NULL CHECK (action IN (
    'create', 'read', 'update', 'delete', 'execute',
    'ai_output_generated', 'output_approved', 'output_rejected',
    'crisis_acknowledged', 'narrative_submitted', 'document_uploaded',
    'login', 'logout'
  )),
  outcome TEXT NOT NULL DEFAULT 'success'
    CHECK (outcome IN ('success', 'minor_failure', 'serious_failure', 'major_failure')),
  resource_type TEXT NOT NULL CHECK (resource_type IN (
    'Patient', 'Encounter', 'Observation', 'DiagnosticReport',
    'CarePlan', 'RiskAssessment', 'Composition', 'Practitioner',
    'AuditEvent', 'Appointment', 'IdiomSubmission', 'Document', 'Session'
  )),
  resource_id TEXT,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  encounter_id UUID,
  description TEXT,
  metadata JSONB,
  source TEXT DEFAULT 'app'
);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert audit events"
  ON public.audit_events FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE POLICY "Clinicians can read their own audit events"
  ON public.audit_events FOR SELECT TO authenticated
  USING (actor_id = auth.uid());

CREATE POLICY "Admins can read all audit events"
  ON public.audit_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_audit_events_actor_id ON public.audit_events(actor_id);
CREATE INDEX idx_audit_events_patient_id ON public.audit_events(patient_id);
CREATE INDEX idx_audit_events_encounter_id ON public.audit_events(encounter_id);
CREATE INDEX idx_audit_events_action ON public.audit_events(action);
CREATE INDEX idx_audit_events_resource_type ON public.audit_events(resource_type);
CREATE INDEX idx_audit_events_recorded_at ON public.audit_events(recorded_at DESC);
CREATE INDEX idx_audit_events_patient_time ON public.audit_events(patient_id, recorded_at DESC);

-- ============================================
-- 2. CONSENTS TABLE
-- ============================================
CREATE TABLE public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  recorded_by UUID NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'clinical_use', 'audio_recording', 'research_participation', 'data_processing'
  )),
  consent_version TEXT NOT NULL DEFAULT '1.0',
  method TEXT NOT NULL DEFAULT 'verbal'
    CHECK (method IN ('verbal', 'written', 'electronic')),
  language_code TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'withdrawn')),
  fhir_scope TEXT NOT NULL DEFAULT 'patient-privacy'
    CHECK (fhir_scope IN ('patient-privacy', 'research', 'adr', 'treatment')),
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at TIMESTAMPTZ,
  withdrawal_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_consents_patient_type_active
  ON public.consents(patient_id, consent_type)
  WHERE status = 'active';

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinicians can record consent"
  ON public.consents FOR INSERT TO authenticated
  WITH CHECK (recorded_by = auth.uid());

CREATE POLICY "Clinicians can view consents they recorded"
  ON public.consents FOR SELECT TO authenticated
  USING (recorded_by = auth.uid());

CREATE POLICY "Clinicians can withdraw consent"
  ON public.consents FOR UPDATE TO authenticated
  USING (recorded_by = auth.uid())
  WITH CHECK (status = 'withdrawn' AND withdrawn_at IS NOT NULL);

CREATE POLICY "Admins can read all consents"
  ON public.consents FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_consents_patient_id ON public.consents(patient_id);
CREATE INDEX idx_consents_recorded_by ON public.consents(recorded_by);
CREATE INDEX idx_consents_consent_type ON public.consents(consent_type);
CREATE INDEX idx_consents_status ON public.consents(status);
CREATE INDEX idx_consents_consented_at ON public.consents(consented_at DESC);

CREATE TRIGGER consents_updated_at
  BEFORE UPDATE ON public.consents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. REFERRALS TABLE
-- ============================================
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  recorded_by UUID NOT NULL,
  context TEXT NOT NULL DEFAULT 'crisis_intervention'
    CHECK (context IN ('crisis_intervention', 'treatment_plan', 'general')),
  crisis_intervention_id UUID,
  pathway_id TEXT,
  referral_type TEXT NOT NULL,
  destination TEXT,
  urgency TEXT NOT NULL DEFAULT 'urgent'
    CHECK (urgency IN ('immediate', 'urgent', 'routine')),
  specialist_type TEXT,
  reason TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'revoked', 'unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinicians can insert referrals"
  ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (recorded_by = auth.uid());

CREATE POLICY "Clinicians can read their referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (recorded_by = auth.uid());

CREATE POLICY "Clinicians can update referral status"
  ON public.referrals FOR UPDATE TO authenticated
  USING (recorded_by = auth.uid());

CREATE POLICY "Admins can read all referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_referrals_patient_id ON public.referrals(patient_id);
CREATE INDEX idx_referrals_recorded_by ON public.referrals(recorded_by);
CREATE INDEX idx_referrals_context ON public.referrals(context);
CREATE INDEX idx_referrals_status ON public.referrals(status);
CREATE INDEX idx_referrals_created_at ON public.referrals(created_at DESC);
CREATE INDEX idx_referrals_patient_status ON public.referrals(patient_id, status);

CREATE TRIGGER referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();