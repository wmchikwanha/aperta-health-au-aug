-- consents: Informed consent records for clinical use and MRCZ research participation
-- FHIR R4 Consent resource alignment
-- POPIA compliance: processing of pseudonymous clinical data requires explicit consent
-- MRCZ ethics: research participation consent must be separately captured and withdrawable
-- No PII stored — patient_id is a system UUID only

CREATE TABLE public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who gave consent — system UUID only, no PII
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,

  -- Who recorded the consent (clinician present at time of consent)
  recorded_by UUID NOT NULL REFERENCES auth.users(id),

  -- What was consented to — four distinct consent categories
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'clinical_use',           -- AI-assisted clinical decision support for this patient's care
    'audio_recording',        -- Recording and transcription of clinical narrative
    'research_participation', -- MRCZ validation study — optional, explicitly separate
    'data_processing'         -- POPIA: processing pseudonymous data via Claude API (Anthropic US servers)
  )),

  -- Version of the consent form/script used — must match ethics-approved version
  consent_version TEXT NOT NULL DEFAULT '1.0',

  -- How consent was obtained
  method TEXT NOT NULL DEFAULT 'verbal'
    CHECK (method IN (
      'verbal',      -- Verbal consent witnessed and recorded by clinician
      'written',     -- Signed paper form
      'electronic'   -- Digital signature or checkbox
    )),

  -- Language in which consent was explained and given (BCP-47 code)
  -- Matches src/lib/languages.ts SUPPORTED_LANGUAGES codes
  language_code TEXT NOT NULL DEFAULT 'en',

  -- FHIR R4 Consent.status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'withdrawn')),

  -- FHIR R4 Consent.scope — HL7 consent-scope value set
  -- patient-privacy | research | adr | treatment
  fhir_scope TEXT NOT NULL DEFAULT 'patient-privacy'
    CHECK (fhir_scope IN ('patient-privacy', 'research', 'adr', 'treatment')),

  -- Timestamps
  consented_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at   TIMESTAMPTZ,
  withdrawal_reason TEXT,

  -- Optional: free-text notes (e.g. interpreter used, capacity assessment note)
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A patient may only have one ACTIVE consent of each type at a time
-- Withdrawal = UPDATE status → 'withdrawn', then INSERT new active consent if re-consenting
CREATE UNIQUE INDEX uq_consents_patient_type_active
  ON public.consents(patient_id, consent_type)
  WHERE status = 'active';

COMMENT ON TABLE public.consents IS
  'Informed consent records. FHIR R4 Consent resource aligned. '
  'Four types: clinical_use, audio_recording, research_participation, data_processing. '
  'research_participation is optional and must be captured separately from clinical_use — '
  'required by MRCZ ethics protocol. '
  'patient_id is a system UUID — no PII stored. '
  'Withdrawal is recorded by updating status + withdrawn_at; audit trail is maintained via audit_events.';

COMMENT ON COLUMN public.consents.consent_version IS
  'Must match the ethics-approved consent form version. '
  'Update when consent language or scope changes and re-consent is required.';

COMMENT ON COLUMN public.consents.language_code IS
  'BCP-47 code for the language used to explain and obtain consent. '
  'e.g. sn (Shona), nd (Ndebele), en (English). '
  'Important for MRCZ audit — consent must be in patient''s primary language.';

COMMENT ON COLUMN public.consents.fhir_scope IS
  'FHIR R4 Consent.scope from HL7 consent-scope value set. '
  'research_participation maps to fhir_scope=research. '
  'clinical_use and data_processing map to fhir_scope=patient-privacy.';

-- Enable RLS
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

-- Clinicians can record consent (INSERT)
CREATE POLICY "Clinicians can record consent"
  ON public.consents
  FOR INSERT
  TO authenticated
  WITH CHECK (recorded_by = auth.uid());

-- Clinicians can view consents they recorded
CREATE POLICY "Clinicians can view consents they recorded"
  ON public.consents
  FOR SELECT
  TO authenticated
  USING (recorded_by = auth.uid());

-- Clinicians can withdraw consent (UPDATE status only)
-- Withdrawal is the only permitted update — prevents accidental data loss
CREATE POLICY "Clinicians can withdraw consent"
  ON public.consents
  FOR UPDATE
  TO authenticated
  USING (recorded_by = auth.uid())
  WITH CHECK (status = 'withdrawn' AND withdrawn_at IS NOT NULL);

-- Admins: full read access for compliance reporting
CREATE POLICY "Admins can read all consents"
  ON public.consents
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- NO DELETE policy — consent records are permanent (MRCZ and POPIA requirement)

-- Indexes
CREATE INDEX idx_consents_patient_id    ON public.consents(patient_id);
CREATE INDEX idx_consents_recorded_by   ON public.consents(recorded_by);
CREATE INDEX idx_consents_consent_type  ON public.consents(consent_type);
CREATE INDEX idx_consents_status        ON public.consents(status);
CREATE INDEX idx_consents_consented_at  ON public.consents(consented_at DESC);

-- Auto-update updated_at on withdrawal
CREATE TRIGGER consents_updated_at
  BEFORE UPDATE ON public.consents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
