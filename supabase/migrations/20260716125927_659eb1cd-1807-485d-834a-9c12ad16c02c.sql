ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_status_check;
ALTER TABLE public.referrals ADD CONSTRAINT referrals_status_check CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'revoked'::text, 'unknown'::text, 'accepted'::text, 'reviewed'::text]));

ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_context_check;
ALTER TABLE public.referrals ADD CONSTRAINT referrals_context_check CHECK (context = ANY (ARRAY['crisis_intervention'::text, 'treatment_plan'::text, 'general'::text, 'chw_upward_referral'::text, 'bcw_upward_referral'::text]));

ALTER TABLE public.chw_sessions
  ADD COLUMN IF NOT EXISTS narrative_translation text,
  ADD COLUMN IF NOT EXISTS atsi_identity_response text,
  ADD COLUMN IF NOT EXISTS atsi_identifies boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS atsi_identity_label text;

ALTER TABLE public.chw_sessions DROP CONSTRAINT IF EXISTS chw_sessions_atsi_identity_response_check;
ALTER TABLE public.chw_sessions ADD CONSTRAINT chw_sessions_atsi_identity_response_check
  CHECK (atsi_identity_response IS NULL OR atsi_identity_response = ANY (ARRAY['none'::text, 'aboriginal'::text, 'torres_strait'::text, 'both'::text, 'not_stated'::text]));

CREATE OR REPLACE FUNCTION public.accept_upward_referral(_referral_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _ref record;
  _assessment_id uuid;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    public.has_role(_caller, 'psychiatrist'::public.app_role)
    OR public.has_role(_caller, 'clinical_nurse'::public.app_role)
    OR public.has_role(_caller, 'admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Only clinicians can accept upward referrals';
  END IF;

  SELECT * INTO _ref FROM public.referrals WHERE id = _referral_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Referral not found';
  END IF;

  IF _ref.context NOT IN ('chw_upward_referral', 'bcw_upward_referral') THEN
    RAISE EXCEPTION 'Referral is not an upward referral';
  END IF;

  UPDATE public.referrals
     SET status = 'accepted',
         destination = _caller::text,
         updated_at = now()
   WHERE id = _referral_id;

  UPDATE public.patients
     SET user_id = _caller,
         updated_at = now()
   WHERE id = _ref.patient_id;

  INSERT INTO public.assessments (
    patient_id, user_id, narrative, processed_result, assessment_date, metadata
  ) VALUES (
    _ref.patient_id,
    _caller,
    COALESCE(_ref.notes, _ref.reason, 'Bicultural Worker handoff'),
    jsonb_build_object(
      'pending', true,
      'source', 'chw_referral',
      'handoff_summary', COALESCE(_ref.notes, _ref.reason, ''),
      'note', 'Awaiting clinician processing — seeded from Bicultural Worker referral.',
      'ai_generated', false
    ),
    now(),
    jsonb_build_object(
      'source', 'chw_referral',
      'referral_id', _ref.id,
      'chw_id', _ref.recorded_by,
      'urgency', _ref.urgency,
      'handoff_notes', _ref.notes
    )
  )
  RETURNING id INTO _assessment_id;

  RETURN _assessment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_upward_referral(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_upward_referral(uuid) TO authenticated;