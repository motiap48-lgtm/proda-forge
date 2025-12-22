-- Function to check for overlapping absences
CREATE OR REPLACE FUNCTION public.check_absence_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  overlapping_count INTEGER;
BEGIN
  -- Check if there's an overlapping absence for the same operator
  SELECT COUNT(*)
  INTO overlapping_count
  FROM operator_absences
  WHERE operator_id = NEW.operator_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
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

-- Create trigger for insert
CREATE TRIGGER check_absence_overlap_insert
  BEFORE INSERT ON operator_absences
  FOR EACH ROW
  EXECUTE FUNCTION check_absence_overlap();

-- Create trigger for update
CREATE TRIGGER check_absence_overlap_update
  BEFORE UPDATE ON operator_absences
  FOR EACH ROW
  EXECUTE FUNCTION check_absence_overlap();

-- Function to merge duplicate absences for an operator
CREATE OR REPLACE FUNCTION public.merge_operator_absences(
  p_operator_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  merged_count INTEGER,
  remaining_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_merged INTEGER := 0;
  v_remaining INTEGER;
  rec RECORD;
  existing_id UUID;
BEGIN
  -- Temporarily disable the overlap trigger
  ALTER TABLE operator_absences DISABLE TRIGGER check_absence_overlap_insert;
  ALTER TABLE operator_absences DISABLE TRIGGER check_absence_overlap_update;

  -- Find and merge overlapping absences
  FOR rec IN (
    SELECT 
      a.id,
      a.absence_type,
      a.start_date,
      a.end_date,
      a.status,
      a.notes
    FROM operator_absences a
    WHERE a.operator_id = p_operator_id
      AND a.status != 'cancelled'
      AND (p_start_date IS NULL OR a.end_date >= p_start_date)
      AND (p_end_date IS NULL OR a.start_date <= p_end_date)
    ORDER BY a.absence_type, a.start_date
  )
  LOOP
    -- Check if there's an existing absence that overlaps or is adjacent
    SELECT id INTO existing_id
    FROM operator_absences
    WHERE operator_id = p_operator_id
      AND id != rec.id
      AND absence_type = rec.absence_type
      AND status != 'cancelled'
      AND (
        -- Overlapping or adjacent dates
        (start_date <= rec.end_date + 1 AND end_date >= rec.start_date - 1)
      )
    LIMIT 1;

    IF existing_id IS NOT NULL THEN
      -- Merge: expand existing record and delete duplicate
      UPDATE operator_absences
      SET 
        start_date = LEAST(start_date, rec.start_date),
        end_date = GREATEST(end_date, rec.end_date),
        updated_at = NOW(),
        notes = CASE 
          WHEN notes IS NULL OR notes = '' THEN rec.notes
          WHEN rec.notes IS NULL OR rec.notes = '' THEN notes
          ELSE notes || '; ' || rec.notes
        END
      WHERE id = existing_id;

      DELETE FROM operator_absences WHERE id = rec.id;
      v_merged := v_merged + 1;
    END IF;
  END LOOP;

  -- Re-enable triggers
  ALTER TABLE operator_absences ENABLE TRIGGER check_absence_overlap_insert;
  ALTER TABLE operator_absences ENABLE TRIGGER check_absence_overlap_update;

  -- Count remaining
  SELECT COUNT(*) INTO v_remaining
  FROM operator_absences
  WHERE operator_id = p_operator_id
    AND status != 'cancelled';

  RETURN QUERY SELECT v_merged, v_remaining;
END;
$$;