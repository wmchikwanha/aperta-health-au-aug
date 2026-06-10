
-- Table for team invitations
CREATE TABLE public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role public.app_role NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all invitations"
  ON public.team_invitations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view invitations for their email"
  ON public.team_invitations FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Index for lookup during signup
CREATE INDEX idx_team_invitations_email_status ON public.team_invitations (email, status);

-- Update handle_new_user to check for invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _invited_role public.app_role;
  _invitation_id uuid;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'),
    NEW.email
  );

  -- Check for a pending, non-expired invitation
  SELECT id, role INTO _invitation_id, _invited_role
  FROM public.team_invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF _invited_role IS NOT NULL THEN
    -- Assign the invited role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _invited_role);

    -- Mark invitation as accepted
    UPDATE public.team_invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = _invitation_id;
  ELSE
    -- Default role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'psychiatrist');
  END IF;

  RETURN NEW;
END;
$$;
