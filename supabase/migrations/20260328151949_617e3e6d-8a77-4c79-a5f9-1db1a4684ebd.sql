-- Allow clinicians to see referrals addressed to them
CREATE POLICY "Clinicians can view referrals addressed to them"
ON public.referrals
FOR SELECT
TO authenticated
USING (destination = auth.uid()::text);