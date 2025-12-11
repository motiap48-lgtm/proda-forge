-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new policy: users can view their own profile OR admins can view all
CREATE POLICY "Users can view own profile or admins view all"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR has_role(auth.uid(), 'admin'::app_role)
);