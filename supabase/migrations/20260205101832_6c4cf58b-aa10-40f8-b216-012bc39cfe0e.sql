-- Fix the trigger function that references non-existent column assigned_shift_id
-- The operators table has assigned_shift_number, not assigned_shift_id

CREATE OR REPLACE FUNCTION public.log_operator_schedule_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_schedule_name TEXT;
BEGIN
  -- Check if any schedule-related fields changed
  -- Note: operators table has assigned_shift_number, NOT assigned_shift_id
  IF OLD.work_schedule_id IS DISTINCT FROM NEW.work_schedule_id
     OR OLD.shift_rotation_enabled IS DISTINCT FROM NEW.shift_rotation_enabled
     OR OLD.shift_rotation_start_date IS DISTINCT FROM NEW.shift_rotation_start_date
     OR OLD.assigned_shift_number IS DISTINCT FROM NEW.assigned_shift_number
  THEN
    -- Get schedule name
    SELECT name INTO v_schedule_name 
    FROM public.work_schedules 
    WHERE id = OLD.work_schedule_id;
    
    -- Close the previous history record
    UPDATE public.operator_schedule_history
    SET effective_to = CURRENT_DATE
    WHERE operator_id = NEW.id
      AND effective_to IS NULL;
    
    -- Insert new history record for the old settings
    INSERT INTO public.operator_schedule_history (
      operator_id,
      work_schedule_id,
      work_schedule_name,
      assigned_shift_id,
      assigned_shift_name,
      shift_rotation_enabled,
      shift_rotation_start_date,
      assigned_shift_number,
      effective_from,
      effective_to,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.work_schedule_id,
      v_schedule_name,
      NULL, -- assigned_shift_id doesn't exist in operators table
      NULL, -- assigned_shift_name doesn't exist in operators table
      OLD.shift_rotation_enabled,
      OLD.shift_rotation_start_date,
      OLD.assigned_shift_number,
      COALESCE(OLD.shift_rotation_start_date, OLD.created_at::date),
      CURRENT_DATE,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$function$;