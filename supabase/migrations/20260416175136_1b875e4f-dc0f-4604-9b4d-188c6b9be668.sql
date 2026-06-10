CREATE POLICY "Authenticated users can register facilities"
ON public.facilities
FOR INSERT
TO authenticated
WITH CHECK (
  registered_by = auth.uid()
  AND approval_status = 'pending'
  AND is_active = false
);

CREATE POLICY "Registrants can view their own facility"
ON public.facilities
FOR SELECT
TO authenticated
USING (registered_by = auth.uid());