
-- Add facility_admin to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'facility_admin';

-- Add approval fields to facilities table
ALTER TABLE public.facilities 
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS registered_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Create facility_users linking table
CREATE TABLE public.facility_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  is_owner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, facility_id)
);

ALTER TABLE public.facility_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own facility link"
  ON public.facility_users FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own facility link"
  ON public.facility_users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all facility users"
  ON public.facility_users FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow facility admins to view referrals for their facility
CREATE POLICY "Facility admins can view their referrals"
  ON public.facility_referrals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.facility_users fu
      WHERE fu.facility_id = facility_referrals.facility_id
        AND fu.user_id = auth.uid()
    )
  );

-- Allow facility admins to update referral status (accept/decline)
CREATE POLICY "Facility admins can update their referrals"
  ON public.facility_referrals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.facility_users fu
      WHERE fu.facility_id = facility_referrals.facility_id
        AND fu.user_id = auth.uid()
    )
  );

-- Allow facility admins to view self-assessment sessions linked to their referrals
CREATE POLICY "Facility admins can view referred sessions"
  ON public.self_assessment_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.facility_referrals fr
      JOIN public.facility_users fu ON fu.facility_id = fr.facility_id
      WHERE fr.session_id = self_assessment_sessions.id
        AND fu.user_id = auth.uid()
    )
  );

-- Allow facility admins to view screening responses for their referred sessions
CREATE POLICY "Facility admins can view referred screening responses"
  ON public.self_assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.facility_referrals fr
      JOIN public.facility_users fu ON fu.facility_id = fr.facility_id
      WHERE fr.session_id = self_assessment_responses.session_id
        AND fu.user_id = auth.uid()
    )
  );

-- Index for facility_users lookups
CREATE INDEX idx_facility_users_user ON public.facility_users(user_id);
CREATE INDEX idx_facility_users_facility ON public.facility_users(facility_id);
CREATE INDEX idx_facilities_approval ON public.facilities(approval_status);
