
-- Drop existing permissive INSERT policies on facility_users
DROP POLICY IF EXISTS "Users can create their own facility link" ON public.facility_users;
DROP POLICY IF EXISTS "Users can insert their own facility link" ON public.facility_users;
DROP POLICY IF EXISTS "Authenticated users can link to facility" ON public.facility_users;

-- New restrictive INSERT policy
CREATE POLICY "Authorized facility links only"
ON public.facility_users
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.facilities f
      WHERE f.id = facility_users.facility_id
        AND f.registered_by = auth.uid()
    )
  )
);
