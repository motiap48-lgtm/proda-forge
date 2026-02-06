-- Add DELETE policy for timesheet_history (admin only)
CREATE POLICY "Only admins can delete timesheet_history"
  ON public.timesheet_history FOR DELETE
  USING ((auth.uid() IS NOT NULL) AND has_role(auth.uid(), 'admin'::app_role));