
-- Fix: Never delete absence_compensations, always update to cancelled
-- This ensures cancelled records are visible when "Show cancelled" toggle is enabled

CREATE OR REPLACE FUNCTION public.auto_cancel_absence_compensation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Process unauthorized absences AND administrative leave with compensation
  IF OLD.absence_type = 'unauthorized_absence' OR OLD.absence_type = 'administrative_leave_with_compensation' THEN

    -- CHANGED: Instead of deleting, update ALL records to cancelled status
    -- This preserves history for the UI toggle "Show cancelled"
    UPDATE absence_compensations
       SET status = 'cancelled', 
           updated_at = NOW(),
           reason = 'Отменено: ' || COALESCE(
             CASE WHEN OLD.absence_type = 'unauthorized_absence' THEN 'прогул' ELSE 'адм. с отработкой' END,
             reason
           )
     WHERE operator_id = OLD.operator_id
       AND absence_date >= OLD.start_date
       AND absence_date <= OLD.end_date
       AND status IN ('pending', 'partial');

  END IF;

  RETURN OLD;
END;
$function$;
