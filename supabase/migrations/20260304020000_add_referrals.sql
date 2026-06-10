-- referrals: Persists clinical referrals independently of crisis intervention saves
-- Covers two contexts:
--   1. Crisis referrals (FirstAidModule → ReferralForm) — previously only saved in state
--   2. Treatment plan referrals (TreatmentPlanSuggestions referral_criteria) — previously display-only
-- FHIR R4 ServiceRequest resource alignment

CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- No PII — patient_id is system UUID
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),

  -- What triggered this referral
  context TEXT NOT NULL DEFAULT 'crisis_intervention'
    CHECK (context IN (
      'crisis_intervention', -- from FirstAidModule / ReferralForm
      'treatment_plan',      -- from AI-generated treatment plan referral_criteria
      'general'              -- standalone clinical referral
    )),

  -- Loose reference to the crisis intervention if applicable
  -- No FK — allows referrals to exist independently and survive cascade deletes
  crisis_intervention_id UUID,

  -- Referral pathway (matches REFERRAL_PATHWAYS[].id in crisisProtocols.ts)
  pathway_id TEXT,

  -- Core referral fields
  referral_type TEXT NOT NULL,     -- e.g. "Emergency Services", "Psychiatric Hospital"
  destination   TEXT,              -- contact info / facility
  urgency       TEXT NOT NULL DEFAULT 'urgent'
    CHECK (urgency IN ('immediate', 'urgent', 'routine')),
  specialist_type TEXT,            -- for treatment plan referrals (e.g. "Psychiatrist")
  reason        TEXT,              -- trigger / indication

  -- Clinician notes
  notes TEXT,

  -- Workflow status — FHIR ServiceRequest.status alignment
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN (
      'active',     -- referral made, awaiting response
      'completed',  -- referral accepted, patient seen
      'revoked',    -- referral cancelled
      'unknown'
    )),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.referrals IS
  'Clinical referrals — persisted immediately on clinician action. '
  'Replaces ephemeral state-only referral in FirstAidModule. '
  'Also stores treatment plan referral_criteria when clinician acts on them. '
  'FHIR R4 ServiceRequest aligned. No PII stored.';

COMMENT ON COLUMN public.referrals.crisis_intervention_id IS
  'Loose reference to crisis_interventions.id — no FK to allow referrals to outlive '
  'crisis intervention records.';

COMMENT ON COLUMN public.referrals.pathway_id IS
  'Corresponds to REFERRAL_PATHWAYS[].id in src/lib/firstaid/crisisProtocols.ts. '
  'e.g. emergency, psychiatric_emergency, crisis_line, community_mental_health.';

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Clinicians can insert referrals
CREATE POLICY "Clinicians can insert referrals"
  ON public.referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (recorded_by = auth.uid());

-- Clinicians can read referrals they recorded
CREATE POLICY "Clinicians can read their referrals"
  ON public.referrals
  FOR SELECT
  TO authenticated
  USING (recorded_by = auth.uid());

-- Clinicians can update status (e.g. mark completed or revoked)
CREATE POLICY "Clinicians can update referral status"
  ON public.referrals
  FOR UPDATE
  TO authenticated
  USING (recorded_by = auth.uid());

-- Admins: full read access
CREATE POLICY "Admins can read all referrals"
  ON public.referrals
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX idx_referrals_patient_id   ON public.referrals(patient_id);
CREATE INDEX idx_referrals_recorded_by  ON public.referrals(recorded_by);
CREATE INDEX idx_referrals_context      ON public.referrals(context);
CREATE INDEX idx_referrals_status       ON public.referrals(status);
CREATE INDEX idx_referrals_created_at   ON public.referrals(created_at DESC);

-- Composite: all active referrals for a patient (most common query)
CREATE INDEX idx_referrals_patient_status
  ON public.referrals(patient_id, status);

-- Auto-update updated_at
CREATE TRIGGER referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
