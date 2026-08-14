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
  _assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1), 'Unknown'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
        email = COALESCE(EXCLUDED.email, public.profiles.email);

  SELECT id, role INTO _invitation_id, _invited_role
  FROM public.team_invitations
  WHERE lower(email) = lower(NEW.email)
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF _invited_role IS NOT NULL THEN
    _assigned_role := _invited_role;
    UPDATE public.team_invitations
      SET status = 'accepted', accepted_at = now()
      WHERE id = _invitation_id;
  ELSE
    _meta_role := NEW.raw_user_meta_data->>'role';
    IF _meta_role IN ('chw','psychiatrist','clinical_nurse','admin','facility_admin','viewer') THEN
      _assigned_role := _meta_role::public.app_role;
    ELSE
      _assigned_role := 'psychiatrist'::public.app_role;
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;