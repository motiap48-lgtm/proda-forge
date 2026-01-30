-- Create trigger function to auto-create compensation for timesheet deficits
CREATE OR REPLACE FUNCTION public.auto_create_timesheet_deficit_compensation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deficit_minutes INTEGER;
  deficit_hours NUMERIC;
BEGIN
  -- Calculate deficit: planned - actual (if positive, there's a deficit)
  deficit_minutes := COALESCE(NEW.planned_minutes, 0) - COALESCE(NEW.actual_minutes, 0);
  
  -- Only process if there's a deficit (actual < planned)
  IF deficit_minutes > 0 THEN
    deficit_hours := ROUND((deficit_minutes / 60.0)::numeric, 2);
    
    -- Check if a compensation record already exists for this date
    -- If it exists and is not cancelled, update it
    -- If it doesn't exist, create it
    INSERT INTO absence_compensations (
      operator_id,
      absence_date,
      absence_hours,
      reason,
      status,
      created_by
    )
    VALUES (
      NEW.operator_id,
      NEW.work_date,
      deficit_hours,
      'Недоработка по табелю',
      'pending',
      NEW.created_by
    )
    ON CONFLICT (operator_id, absence_date) 
    WHERE status != 'cancelled'
    DO UPDATE SET
      absence_hours = EXCLUDED.absence_hours,
      reason = 'Недоработка по табелю',
      updated_at = NOW();
      
  ELSE
    -- No deficit (actual >= planned), cancel any existing timesheet deficit compensation
    UPDATE absence_compensations
    SET status = 'cancelled',
        updated_at = NOW(),
        reason = CASE 
          WHEN reason = 'Недоработка по табелю' THEN 'Отменено: недоработка закрыта'
          ELSE reason
        END
    WHERE operator_id = NEW.operator_id
      AND absence_date = NEW.work_date
      AND reason = 'Недоработка по табелю'
      AND status != 'cancelled';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on operator_timesheets
DROP TRIGGER IF EXISTS auto_create_timesheet_deficit_compensation_trigger ON operator_timesheets;
CREATE TRIGGER auto_create_timesheet_deficit_compensation_trigger
  AFTER INSERT OR UPDATE ON operator_timesheets
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_timesheet_deficit_compensation();

-- Also handle deletion - cancel compensation when timesheet is deleted
CREATE OR REPLACE FUNCTION public.auto_cancel_timesheet_deficit_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Cancel any timesheet deficit compensation for this date
  UPDATE absence_compensations
  SET status = 'cancelled',
      updated_at = NOW(),
      reason = 'Отменено: запись табеля удалена'
  WHERE operator_id = OLD.operator_id
    AND absence_date = OLD.work_date
    AND reason = 'Недоработка по табелю'
    AND status != 'cancelled';
    
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS auto_cancel_timesheet_deficit_on_delete_trigger ON operator_timesheets;
CREATE TRIGGER auto_cancel_timesheet_deficit_on_delete_trigger
  BEFORE DELETE ON operator_timesheets
  FOR EACH ROW
  EXECUTE FUNCTION auto_cancel_timesheet_deficit_on_delete();