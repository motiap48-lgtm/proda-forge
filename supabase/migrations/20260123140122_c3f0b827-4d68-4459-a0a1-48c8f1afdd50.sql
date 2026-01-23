-- Create table to track operator schedule change history
CREATE TABLE public.operator_schedule_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  work_schedule_id UUID REFERENCES public.work_schedules(id) ON DELETE SET NULL,
  work_schedule_name TEXT, -- Store name for historical reference even if schedule deleted
  assigned_shift_id UUID REFERENCES public.work_schedule_shifts(id) ON DELETE SET NULL,
  assigned_shift_name TEXT, -- Store name for historical reference
  shift_rotation_enabled BOOLEAN DEFAULT false,
  shift_rotation_start_date DATE,
  assigned_shift_number INTEGER,
  effective_from DATE NOT NULL,
  effective_to DATE, -- NULL means current/active
  change_reason TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.operator_schedule_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view operator schedule history"
ON public.operator_schedule_history
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create operator schedule history"
ON public.operator_schedule_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update operator schedule history"
ON public.operator_schedule_history
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Create function to log schedule changes
CREATE OR REPLACE FUNCTION public.log_operator_schedule_change()
RETURNS TRIGGER AS $$
DECLARE
  v_schedule_name TEXT;
  v_shift_name TEXT;
BEGIN
  -- Check if any schedule-related fields changed
  IF OLD.work_schedule_id IS DISTINCT FROM NEW.work_schedule_id
     OR OLD.assigned_shift_id IS DISTINCT FROM NEW.assigned_shift_id
     OR OLD.shift_rotation_enabled IS DISTINCT FROM NEW.shift_rotation_enabled
     OR OLD.shift_rotation_start_date IS DISTINCT FROM NEW.shift_rotation_start_date
     OR OLD.assigned_shift_number IS DISTINCT FROM NEW.assigned_shift_number
  THEN
    -- Get old schedule name
    SELECT name INTO v_schedule_name 
    FROM public.work_schedules 
    WHERE id = OLD.work_schedule_id;
    
    -- Get old shift name
    SELECT name INTO v_shift_name 
    FROM public.work_schedule_shifts 
    WHERE id = OLD.assigned_shift_id;
    
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
      OLD.assigned_shift_id,
      v_shift_name,
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_log_operator_schedule_change ON public.operators;
CREATE TRIGGER trigger_log_operator_schedule_change
BEFORE UPDATE ON public.operators
FOR EACH ROW
EXECUTE FUNCTION public.log_operator_schedule_change();

-- Add index for faster queries
CREATE INDEX idx_operator_schedule_history_operator 
ON public.operator_schedule_history(operator_id, effective_from DESC);