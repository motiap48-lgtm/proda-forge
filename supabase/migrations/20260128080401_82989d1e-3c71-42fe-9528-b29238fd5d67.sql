-- Update the overlap check trigger to exclude cancelled absences
CREATE OR REPLACE FUNCTION public.check_absence_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for overlapping absences, excluding cancelled ones
  IF EXISTS (
    SELECT 1 FROM public.operator_absences
    WHERE operator_id = NEW.operator_id
      AND status != 'cancelled'
      AND id != COALESCE(
        CASE WHEN TG_OP = 'UPDATE' THEN OLD.id ELSE NULL END,
        '00000000-0000-0000-0000-000000000000'::uuid
      )
      AND NEW.status != 'cancelled'
      AND (
        (NEW.start_date <= end_date AND NEW.end_date >= start_date)
      )
  ) THEN
    RAISE EXCEPTION 'Overlapping absence exists for this operator in the specified date range'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;