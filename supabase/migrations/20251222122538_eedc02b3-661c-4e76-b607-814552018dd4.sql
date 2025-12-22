-- Function to automatically create absence_compensation when unauthorized_absence is created/approved
CREATE OR REPLACE FUNCTION public.auto_create_absence_compensation()
RETURNS TRIGGER AS $$
DECLARE
  schedule_hours NUMERIC := 8; -- Default hours
  shift_record RECORD;
BEGIN
  -- Only process unauthorized absences that are approved
  IF NEW.absence_type = 'unauthorized_absence' AND NEW.status = 'approved' THEN
    -- Check if compensation record already exists for this date and operator
    IF NOT EXISTS (
      SELECT 1 FROM absence_compensations 
      WHERE operator_id = NEW.operator_id 
        AND absence_date = NEW.start_date
        AND status != 'cancelled'
    ) THEN
      -- Try to get hours from operator's schedule
      SELECT wss.net_work_minutes INTO shift_record
      FROM operators o
      JOIN work_schedules ws ON ws.id = o.work_schedule_id
      JOIN work_schedule_shifts wss ON wss.work_schedule_id = ws.id
      WHERE o.id = NEW.operator_id
      LIMIT 1;
      
      IF shift_record.net_work_minutes IS NOT NULL THEN
        schedule_hours := shift_record.net_work_minutes / 60.0;
      END IF;
      
      -- Create compensation record for each day in the absence range
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
        SELECT 1 FROM absence_compensations ac
        WHERE ac.operator_id = NEW.operator_id 
          AND ac.absence_date = d::date
          AND ac.status != 'cancelled'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS auto_create_compensation_on_insert ON operator_absences;
CREATE TRIGGER auto_create_compensation_on_insert
  AFTER INSERT ON operator_absences
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_absence_compensation();

-- Create trigger for UPDATE (when status changes to approved)
DROP TRIGGER IF EXISTS auto_create_compensation_on_update ON operator_absences;
CREATE TRIGGER auto_create_compensation_on_update
  AFTER UPDATE OF status ON operator_absences
  FOR EACH ROW
  WHEN (OLD.status != 'approved' AND NEW.status = 'approved')
  EXECUTE FUNCTION auto_create_absence_compensation();