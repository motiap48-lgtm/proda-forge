-- Update contractors table RLS policy to restrict SELECT access
-- Drop the existing policy that allows all authenticated users to read
DROP POLICY IF EXISTS "Authenticated users can read contractors" ON public.contractors;

-- Create new policy that restricts SELECT to admin and production_manager roles only
CREATE POLICY "Authorized users can read contractors"
ON public.contractors
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'production_manager'::app_role)
  )
);