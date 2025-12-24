-- Add unique constraint to prevent duplicate absence compensations for same operator+date
CREATE UNIQUE INDEX IF NOT EXISTS absence_compensations_operator_date_unique_idx 
ON absence_compensations (operator_id, absence_date) 
WHERE status != 'cancelled';

-- Update the auto_create_absence_compensation function to handle conflicts better
CREATE OR REPLACE FUNCTION public.auto_create_absence_compensation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  schedule_hours NUMERIC := 8; -- default
  net_minutes INTEGER;
  target_shift INTEGER;
BEGIN
  -- Process unauthorized absences AND administrative leave with compensation that are approved
  IF (NEW.absence_type = 'unauthorized_absence' OR NEW.absence_type = 'administrative_leave_with_compensation') 
     AND NEW.status = 'approved' THEN

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
      schedule_hours := ROUND((net_minutes / 60.0)::numeric, 2);
    END IF;

    -- Reactivate cancelled rows without compensation records (avoid duplicates)
    UPDATE absence_compensations ac
       SET status = 'pending',
           absence_hours = schedule_hours,
           reason = COALESCE(NEW.notes, CASE WHEN NEW.absence_type = 'unauthorized_absence' THEN 'Прогул' ELSE 'Административный (с отработкой)' END),
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

    -- Create a compensation row for EVERY date in the range if it's missing (use ON CONFLICT to avoid duplicates)
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
      COALESCE(NEW.notes, CASE WHEN NEW.absence_type = 'unauthorized_absence' THEN 'Прогул' ELSE 'Административный (с отработкой)' END),
      'pending',
      NEW.created_by
    FROM generate_series(NEW.start_date, NEW.end_date, '1 day'::interval) d
    WHERE NOT EXISTS (
      SELECT 1
      FROM absence_compensations ac
      WHERE ac.operator_id = NEW.operator_id
        AND ac.absence_date = d::date
        AND ac.status != 'cancelled'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;