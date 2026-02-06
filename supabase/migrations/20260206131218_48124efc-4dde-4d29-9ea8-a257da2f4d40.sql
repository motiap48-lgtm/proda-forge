-- Add DELETE policy for brigade_member_history to allow admins to clear history
CREATE POLICY "Admins can delete brigade member history"
ON public.brigade_member_history
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);