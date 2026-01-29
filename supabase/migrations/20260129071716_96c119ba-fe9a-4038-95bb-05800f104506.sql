-- Fix: Do not delete absence_compensations when an absence is cancelled.
-- Always keep history by marking rows as 'cancelled' so UI "Show cancelled" can display them.

CREATE OR REPLACE FUNCTION public.auto_cancel_compensation_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.absence_type = 'unauthorized_absence' OR NEW.absence_type = 'administrative_leave_with_compensation')
     AND NEW.status = 'cancelled'
     AND COALESCE(OLD.status, '') <> 'cancelled' THEN

    UPDATE absence_compensations ac
       SET status = 'cancelled',
           updated_at = NOW(),
           reason = CASE
             WHEN ac.reason IS NULL OR ac.reason = '' THEN
               'Отменено: ' || (CASE WHEN NEW.absence_type = 'unauthorized_absence' THEN 'прогул' ELSE 'адм. с отработкой' END)
             WHEN ac.reason ILIKE 'Отменено:%' THEN
               ac.reason
             ELSE
               'Отменено: ' || ac.reason
           END
     WHERE ac.operator_id = NEW.operator_id
       AND ac.absence_date >= NEW.start_date
       AND ac.absence_date <= NEW.end_date
       AND ac.status <> 'cancelled';
  END IF;

  RETURN NEW;
END;
$function$;
