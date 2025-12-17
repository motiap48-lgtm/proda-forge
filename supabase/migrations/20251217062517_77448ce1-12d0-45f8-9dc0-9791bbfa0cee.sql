-- Fix 1: Restrict customers table SELECT to admin and production_manager only
DROP POLICY IF EXISTS "Authenticated users can read customers" ON public.customers;

CREATE POLICY "Authorized users can read customers" 
ON public.customers 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL) AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'production_manager'::app_role)
  )
);

-- Fix 2: Restrict user_roles SELECT to authenticated users only
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

CREATE POLICY "Authenticated users can view roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);