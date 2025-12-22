-- Function to cancel absence_compensation when unauthorized_absence is deleted or cancelled
CREATE OR REPLACE FUNCTION public.auto_cancel_absence_compensation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process unauthorized absences
  IF OLD.absence_type = 'unauthorized_absence' THEN
    -- Cancel related compensation records for the date range
    UPDATE absence_compensations 
    SET status = 'cancelled', updated_at = NOW()
    WHERE operator_id = OLD.operator_id 
      AND absence_date >= OLD.start_date 
      AND absence_date <= OLD.end_date
      AND status IN ('pending', 'partial');
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for DELETE
DROP TRIGGER IF EXISTS auto_cancel_compensation_on_delete ON operator_absences;
CREATE TRIGGER auto_cancel_compensation_on_delete
  BEFORE DELETE ON operator_absences
  FOR EACH ROW
  EXECUTE FUNCTION auto_cancel_absence_compensation();

-- Trigger for UPDATE when status changes to cancelled
CREATE OR REPLACE FUNCTION public.auto_cancel_compensation_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.absence_type = 'unauthorized_absence' AND NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE absence_compensations 
    SET status = 'cancelled', updated_at = NOW()
    WHERE operator_id = NEW.operator_id 
      AND absence_date >= NEW.start_date 
      AND absence_date <= NEW.end_date
      AND status IN ('pending', 'partial');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS auto_cancel_compensation_on_status_cancelled ON operator_absences;
CREATE TRIGGER auto_cancel_compensation_on_status_cancelled
  AFTER UPDATE OF status ON operator_absences
  FOR EACH ROW
  WHEN (OLD.status != 'cancelled' AND NEW.status = 'cancelled')
  EXECUTE FUNCTION auto_cancel_compensation_on_status_change();