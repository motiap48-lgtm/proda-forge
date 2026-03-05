
DROP POLICY IF EXISTS "Users can view all operator absences" ON public.operator_absences;

CREATE POLICY "Authorized users can view operator absences"
ON public.operator_absences FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'production_manager')
);
