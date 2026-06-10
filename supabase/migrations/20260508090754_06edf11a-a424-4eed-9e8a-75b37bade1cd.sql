
-- 1. CHW sessions table
CREATE TABLE public.chw_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chw_id uuid NOT NULL,
  patient_pseudonym text NOT NULL,
  age_band text,
  language_code text DEFAULT 'en',
  narrative_text text,
  phq9_responses jsonb,
  phq9_score integer,
  phq9_severity text,
  phq9_item9_flag boolean DEFAULT false,
  notes text,
  status text NOT NULL DEFAULT 'active',
  referral_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.chw_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CHW can view own sessions" ON public.chw_sessions
  FOR SELECT USING (auth.uid() = chw_id);
CREATE POLICY "CHW can insert own sessions" ON public.chw_sessions
  FOR INSERT WITH CHECK (auth.uid() = chw_id);
CREATE POLICY "CHW can update own sessions" ON public.chw_sessions
  FOR UPDATE USING (auth.uid() = chw_id);
CREATE POLICY "CHW can delete own active sessions" ON public.chw_sessions
  FOR DELETE USING (auth.uid() = chw_id AND status = 'active');
CREATE POLICY "Admins can view all CHW sessions" ON public.chw_sessions
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE TRIGGER update_chw_sessions_updated_at
  BEFORE UPDATE ON public.chw_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enforce max 5 active sessions per CHW
CREATE OR REPLACE FUNCTION public.enforce_chw_session_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    IF (SELECT COUNT(*) FROM public.chw_sessions
        WHERE chw_id = NEW.chw_id AND status = 'active'
          AND (TG_OP = 'INSERT' OR id <> NEW.id)) >= 5 THEN
      RAISE EXCEPTION 'CHW cannot have more than 5 active sessions. Complete or refer existing sessions first.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER chw_sessions_limit_check
  BEFORE INSERT OR UPDATE ON public.chw_sessions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_chw_session_limit();

-- 2. Update handle_new_user to honour role from metadata (for CHW signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _invited_role public.app_role;
  _invitation_id uuid;
  _meta_role text;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'),
    NEW.email
  );

  SELECT id, role INTO _invitation_id, _invited_role
  FROM public.team_invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF _invited_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _invited_role);
    UPDATE public.team_invitations SET status = 'accepted', accepted_at = now() WHERE id = _invitation_id;
  ELSE
    _meta_role := NEW.raw_user_meta_data->>'role';
    IF _meta_role = 'chw' THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'chw'::public.app_role);
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'psychiatrist'::public.app_role);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
