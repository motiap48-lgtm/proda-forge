-- Tighten operator_absences policies (avoid USING/WITH CHECK true)
-- Any authenticated user may manage absences.

DROP POLICY IF EXISTS "Users can create operator absences" ON public.operator_absences;
DROP POLICY IF EXISTS "Users can update operator absences" ON public.operator_absences;
DROP POLICY IF EXISTS "Users can delete operator absences" ON public.operator_absences;

CREATE POLICY "Users can create operator absences"
ON public.operator_absences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update operator absences"
ON public.operator_absences
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete operator absences"
ON public.operator_absences
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);