-- Fix the absence overlap check trigger to properly handle UPDATE operations
-- The issue: when updating, NEW.id should contain the row's ID, but we need to ensure
-- we're excluding the current row correctly

CREATE OR REPLACE FUNCTION public.check_absence_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  overlapping_count INTEGER;
  current_id UUID;
BEGIN
  -- For UPDATE, use OLD.id (the current row's ID) to exclude self
  -- For INSERT, NEW.id might be set (if specified) or we use a dummy UUID
  IF TG_OP = 'UPDATE' THEN
    current_id := OLD.id;
  ELSE
    current_id := COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;

  -- Check if there's an overlapping absence for the same operator
  SELECT COUNT(*)
  INTO overlapping_count
  FROM operator_absences
  WHERE operator_id = NEW.operator_id
    AND id != current_id
    AND status != 'cancelled'
    AND NEW.status != 'cancelled'
    AND (
      -- Check date range overlap
      (NEW.start_date <= end_date AND NEW.end_date >= start_date)
    );

  IF overlapping_count > 0 THEN
    RAISE EXCEPTION 'Overlapping absence exists for this operator in the specified date range'
      USING HINT = 'Please check existing absences or adjust the date range';
  END IF;

  RETURN NEW;
END;
$$;