-- Fix automatic creation/cancellation of compensation rows for unauthorized absences (прогулы)

CREATE OR REPLACE FUNCTION public.auto_create_absence_compensation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  schedule_hours NUMERIC := 8; -- default
  net_minutes INTEGER;
  target_shift INTEGER;
BEGIN
  -- Only process unauthorized absences that are approved
  IF NEW.absence_type = 'unauthorized_absence' AND NEW.status = 'approved' THEN

    -- Determine operator shift hours (prefer assigned_shift_number, fallback shift 1)
    SELECT COALESCE(o.assigned_shift_number, 1)
      INTO target_shift
    FROM operators o
    WHERE o.id = NEW.operator_id;

    SELECT COALESCE(wss.net_work_minutes, (wss.gross_work_minutes - wss.break_minutes))
      INTO net_minutes
    FROM operators o
    JOIN work_schedule_shifts wss ON wss.work_schedule_id = o.work_schedule_id
    WHERE o.id = NEW.operator_id
    ORDER BY
      CASE WHEN wss.shift_number = COALESCE(o.assigned_shift_number, 1) THEN 0 ELSE 1 END,
      wss.shift_number
    LIMIT 1;

    IF net_minutes IS NOT NULL THEN
      schedule_hours := net_minutes / 60.0;
    END IF;

    -- Reactivate cancelled rows without compensation records (avoid duplicates)
    UPDATE absence_compensations ac
       SET status = 'pending',
           absence_hours = schedule_hours,
           reason = COALESCE(NEW.notes, 'Прогул'),
           updated_at = NOW()
     WHERE ac.operator_id = NEW.operator_id
       AND ac.absence_date >= NEW.start_date
       AND ac.absence_date <= NEW.end_date
       AND ac.status = 'cancelled'
       AND NOT EXISTS (
         SELECT 1
         FROM compensation_records cr
         WHERE cr.absence_compensation_id = ac.id
       );

    -- Create a compensation row for EVERY date in the range if it's missing
    INSERT INTO absence_compensations (
      operator_id,
      absence_date,
      absence_hours,
      reason,
      status,
      created_by
    )
    SELECT
      NEW.operator_id,
      d::date,
      schedule_hours,
      COALESCE(NEW.notes, 'Прогул'),
      'pending',
      NEW.created_by
    FROM generate_series(NEW.start_date, NEW.end_date, '1 day'::interval) d
    WHERE NOT EXISTS (
      SELECT 1
      FROM absence_compensations ac
      WHERE ac.operator_id = NEW.operator_id
        AND ac.absence_date = d::date
    );
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.auto_cancel_absence_compensation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only process unauthorized absences
  IF OLD.absence_type = 'unauthorized_absence' THEN

    -- Remove compensation rows completely if there were no worked-off records
    DELETE FROM absence_compensations ac
     WHERE ac.operator_id = OLD.operator_id
       AND ac.absence_date >= OLD.start_date
       AND ac.absence_date <= OLD.end_date
       AND NOT EXISTS (
         SELECT 1
         FROM compensation_records cr
         WHERE cr.absence_compensation_id = ac.id
       );

    -- If there are compensation records (partial work-off), keep history but exclude from balance
    UPDATE absence_compensations
       SET status = 'cancelled', updated_at = NOW()
     WHERE operator_id = OLD.operator_id
       AND absence_date >= OLD.start_date
       AND absence_date <= OLD.end_date
       AND status IN ('pending', 'partial');
  END IF;

  RETURN OLD;
END;
$$;


CREATE OR REPLACE FUNCTION public.auto_cancel_compensation_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.absence_type = 'unauthorized_absence'
     AND NEW.status = 'cancelled'
     AND OLD.status <> 'cancelled' THEN

    -- Remove rows without any worked-off records
    DELETE FROM absence_compensations ac
     WHERE ac.operator_id = NEW.operator_id
       AND ac.absence_date >= NEW.start_date
       AND ac.absence_date <= NEW.end_date
       AND NOT EXISTS (
         SELECT 1
         FROM compensation_records cr
         WHERE cr.absence_compensation_id = ac.id
       );

    -- Keep history for rows that have work-off records, but exclude them from balance
    UPDATE absence_compensations
       SET status = 'cancelled', updated_at = NOW()
     WHERE operator_id = NEW.operator_id
       AND absence_date >= NEW.start_date
       AND absence_date <= NEW.end_date
       AND status IN ('pending', 'partial');
  END IF;

  RETURN NEW;
END;
$$;
