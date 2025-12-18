-- Drop existing permissive SELECT policy for operators
DROP POLICY IF EXISTS "Authenticated users can read operators" ON public.operators;

-- Create new restrictive SELECT policy for operators - only admin and production_manager can view
CREATE POLICY "Authorized users can read operators" 
ON public.operators 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL) AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'production_manager'::app_role))
);