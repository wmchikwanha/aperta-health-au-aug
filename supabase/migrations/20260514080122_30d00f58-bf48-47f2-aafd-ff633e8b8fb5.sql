DROP FUNCTION public.list_referral_clinicians();
CREATE OR REPLACE FUNCTION public.list_referral_clinicians()
 RETURNS TABLE(id uuid, full_name text, role text, email text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.full_name, ur.role::text, p.email
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role IN ('clinical_nurse','psychiatrist','admin')
    AND (
      public.has_role(auth.uid(), 'chw'::public.app_role)
      OR public.has_role(auth.uid(), 'clinical_nurse'::public.app_role)
      OR public.has_role(auth.uid(), 'psychiatrist'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  ORDER BY
    CASE ur.role::text WHEN 'clinical_nurse' THEN 0 WHEN 'psychiatrist' THEN 1 ELSE 2 END,
    p.full_name;
$function$;
GRANT EXECUTE ON FUNCTION public.list_referral_clinicians() TO authenticated;