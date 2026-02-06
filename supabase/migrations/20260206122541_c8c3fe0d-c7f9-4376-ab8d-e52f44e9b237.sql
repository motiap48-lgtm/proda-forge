-- Обновляем функцию триггера для использования notes из табеля
CREATE OR REPLACE FUNCTION auto_create_timesheet_deficit_compensation()
RETURNS TRIGGER AS $$
DECLARE
  deficit_minutes INTEGER;
  deficit_hours NUMERIC;
  deficit_reason TEXT;
BEGIN
  -- Calculate deficit: planned - actual (if positive, there's a deficit)
  deficit_minutes := COALESCE(NEW.planned_minutes, 0) - COALESCE(NEW.actual_minutes, 0);
  
  -- Only process if there's a deficit (actual < planned)
  IF deficit_minutes > 0 THEN
    deficit_hours := ROUND((deficit_minutes / 60.0)::numeric, 2);
    
    -- Build reason with notes if provided
    IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
      deficit_reason := 'Недоработка по табелю: ' || NEW.notes;
    ELSE
      deficit_reason := 'Недоработка по табелю';
    END IF;
    
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
      deficit_reason,
      'pending',
      NEW.created_by
    )
    ON CONFLICT (operator_id, absence_date) 
    WHERE status != 'cancelled'
    DO UPDATE SET
      absence_hours = EXCLUDED.absence_hours,
      reason = deficit_reason,
      updated_at = NOW();
      
  ELSE
    -- No deficit (actual >= planned), cancel any existing timesheet deficit compensation
    UPDATE absence_compensations
    SET status = 'cancelled',
        updated_at = NOW(),
        reason = CASE 
          WHEN reason LIKE 'Недоработка по табелю%' THEN 'Отменено: недоработка закрыта'
          ELSE reason
        END
    WHERE operator_id = NEW.operator_id
      AND absence_date = NEW.work_date
      AND reason LIKE 'Недоработка по табелю%'
      AND status != 'cancelled';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;