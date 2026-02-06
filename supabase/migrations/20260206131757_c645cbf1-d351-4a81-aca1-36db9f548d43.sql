-- Drop existing policy and recreate with correct syntax using has_role function
DROP POLICY IF EXISTS "Admins can delete brigade member history" ON public.brigade_member_history;

CREATE POLICY "Admins can delete brigade member history"
ON public.brigade_member_history
FOR DELETE
USING (
  (auth.uid() IS NOT NULL) AND has_role(auth.uid(), 'admin'::app_role)
);