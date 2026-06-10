-- audit_events: Immutable audit log for all clinical actions
-- FHIR R4 AuditEvent resource alignment
-- Non-negotiable for SaMD compliance and clinician accountability
-- No UPDATE or DELETE permitted — append-only

CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- FHIR AuditEvent.recorded
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- FHIR AuditEvent.agent — who performed the action
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  actor_role TEXT NOT NULL
    CHECK (actor_role IN ('clinician', 'admin', 'system', 'supervisor')),

  -- FHIR AuditEvent.action (CRUD + clinical-specific)
  -- C=create, R=read, U=update, D=delete, E=execute
  action TEXT NOT NULL CHECK (action IN (
    'create',
    'read',
    'update',
    'delete',
    'execute',
    'ai_output_generated',   -- AI produced a clinical suggestion
    'output_approved',       -- Clinician approved an AI output
    'output_rejected',       -- Clinician rejected an AI output
    'crisis_acknowledged',   -- Crisis alert acknowledged by clinician
    'narrative_submitted',   -- Clinical narrative submitted for processing
    'document_uploaded',     -- Document uploaded for processing
    'login',
    'logout'
  )),

  -- FHIR AuditEvent.outcome
  outcome TEXT NOT NULL DEFAULT 'success'
    CHECK (outcome IN ('success', 'minor_failure', 'serious_failure', 'major_failure')),

  -- FHIR AuditEvent.entity — what was acted upon
  resource_type TEXT NOT NULL CHECK (resource_type IN (
    'Patient',
    'Encounter',
    'Observation',
    'DiagnosticReport',
    'CarePlan',
    'RiskAssessment',
    'Composition',
    'Practitioner',
    'AuditEvent',
    'Appointment',
    'IdiomSubmission',
    'Document',
    'Session'
  )),
  resource_id TEXT,          -- UUID or identifier of the resource acted on

  -- Clinical context (anonymised — no PII)
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  encounter_id UUID,         -- references assessments.id (loose — no FK to avoid cascade issues)

  -- Human-readable description for audit reports
  description TEXT,

  -- FHIR AuditEvent.entity.detail — extensible key/value metadata
  -- e.g. {"model": "claude-sonnet-4-6", "tokens": 1024, "confidence": 0.87}
  metadata JSONB,

  -- Source system / edge function that generated this event
  source TEXT DEFAULT 'app'  -- 'app' | function name e.g. 'process-narrative'
);

COMMENT ON TABLE public.audit_events IS
  'Immutable append-only audit log. FHIR R4 AuditEvent aligned. '
  'Records all clinician actions and AI-generated outputs. '
  'No UPDATE or DELETE is permitted — rows are permanent. '
  'Required for SaMD compliance and MRCZ ethics submission. '
  'No patient PII stored — patient_id is a system UUID only.';

COMMENT ON COLUMN public.audit_events.action IS
  'FHIR AuditEvent.action plus clinical extensions. '
  'ai_output_generated: AI produced a suggestion. '
  'output_approved/rejected: clinician sign-off. '
  'crisis_acknowledged: required acknowledgement of RED ALERT.';

COMMENT ON COLUMN public.audit_events.metadata IS
  'Free-form JSONB for event-specific detail. '
  'AI events: model name, token count, confidence score. '
  'Approval events: output type (MSE/diagnosis/treatment). '
  'Never include PII.';

COMMENT ON COLUMN public.audit_events.encounter_id IS
  'Loose reference to assessments.id — no FK constraint to avoid '
  'cascade deletion of audit records when encounters are removed.';

-- Enable RLS
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert (system writes on their behalf)
CREATE POLICY "Authenticated users can insert audit events"
  ON public.audit_events
  FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- Clinicians can read their own audit trail
CREATE POLICY "Clinicians can read their own audit events"
  ON public.audit_events
  FOR SELECT
  TO authenticated
  USING (actor_id = auth.uid());

-- Admins/supervisors can read all audit events
CREATE POLICY "Admins can read all audit events"
  ON public.audit_events
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- NO UPDATE policy — audit records are immutable
-- NO DELETE policy — audit records are permanent

-- Indexes for common query patterns
CREATE INDEX idx_audit_events_actor_id      ON public.audit_events(actor_id);
CREATE INDEX idx_audit_events_patient_id    ON public.audit_events(patient_id);
CREATE INDEX idx_audit_events_encounter_id  ON public.audit_events(encounter_id);
CREATE INDEX idx_audit_events_action        ON public.audit_events(action);
CREATE INDEX idx_audit_events_resource_type ON public.audit_events(resource_type);
CREATE INDEX idx_audit_events_recorded_at   ON public.audit_events(recorded_at DESC);

-- Composite: all events for a patient in time order (most common audit query)
CREATE INDEX idx_audit_events_patient_time
  ON public.audit_events(patient_id, recorded_at DESC);
