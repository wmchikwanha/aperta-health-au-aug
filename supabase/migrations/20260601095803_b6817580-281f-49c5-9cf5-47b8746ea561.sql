
-- Add referral code + PIN + optional contact fields to self_assessment_sessions
ALTER TABLE public.self_assessment_sessions
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS verification_pin_hash text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS pin_failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_self_assessment_sessions_referral_code
  ON public.self_assessment_sessions (referral_code);

-- Pseudonymous messages thread between self-assessor and matched facility
CREATE TABLE IF NOT EXISTS public.referral_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  sender text NOT NULL CHECK (sender IN ('facility','self_assessor')),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.referral_messages TO authenticated;
GRANT ALL ON public.referral_messages TO service_role;

ALTER TABLE public.referral_messages ENABLE ROW LEVEL SECURITY;

-- Facility users (matched to the session) can read messages in their threads
CREATE POLICY "Facility users can view their referral messages"
ON public.referral_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.facility_users fu
    WHERE fu.facility_id = referral_messages.facility_id
      AND fu.user_id = auth.uid()
  )
);

-- Facility users can post messages from their facility
CREATE POLICY "Facility users can post referral messages"
ON public.referral_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender = 'facility'
  AND EXISTS (
    SELECT 1
    FROM public.facility_users fu
    WHERE fu.facility_id = referral_messages.facility_id
      AND fu.user_id = auth.uid()
  )
);

-- Facility users can mark messages as read
CREATE POLICY "Facility users can update read state"
ON public.referral_messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.facility_users fu
    WHERE fu.facility_id = referral_messages.facility_id
      AND fu.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all referral messages"
ON public.referral_messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_referral_messages_session ON public.referral_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_referral_messages_facility ON public.referral_messages(facility_id, created_at);
