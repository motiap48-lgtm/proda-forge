-- ================================================
-- 1. Таблица истории изменений табеля
-- ================================================
CREATE TABLE public.timesheet_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id uuid NOT NULL,
  operator_id uuid NOT NULL,
  work_date date NOT NULL,
  action_type text NOT NULL, -- 'created', 'updated', 'deleted'
  old_actual_minutes integer,
  new_actual_minutes integer,
  old_planned_minutes integer,
  new_planned_minutes integer,
  old_status text,
  new_status text,
  old_notes text,
  new_notes text,
  changed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.timesheet_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read timesheet_history"
  ON public.timesheet_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert timesheet_history"
  ON public.timesheet_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Index for fast queries
CREATE INDEX idx_timesheet_history_operator_date 
  ON public.timesheet_history(operator_id, work_date);
CREATE INDEX idx_timesheet_history_timesheet_id 
  ON public.timesheet_history(timesheet_id);

-- ================================================
-- 2. Триггер для логирования изменений табеля
-- ================================================
CREATE OR REPLACE FUNCTION public.log_timesheet_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO timesheet_history (
      timesheet_id, operator_id, work_date, action_type,
      new_actual_minutes, new_planned_minutes, new_status, new_notes,
      changed_by
    ) VALUES (
      NEW.id, NEW.operator_id, NEW.work_date, 'created',
      NEW.actual_minutes, NEW.planned_minutes, NEW.status, NEW.notes,
      auth.uid()
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if meaningful fields changed
    IF OLD.actual_minutes IS DISTINCT FROM NEW.actual_minutes
       OR OLD.planned_minutes IS DISTINCT FROM NEW.planned_minutes
       OR OLD.status IS DISTINCT FROM NEW.status
       OR OLD.notes IS DISTINCT FROM NEW.notes
    THEN
      INSERT INTO timesheet_history (
        timesheet_id, operator_id, work_date, action_type,
        old_actual_minutes, new_actual_minutes,
        old_planned_minutes, new_planned_minutes,
        old_status, new_status,
        old_notes, new_notes,
        changed_by
      ) VALUES (
        NEW.id, NEW.operator_id, NEW.work_date, 'updated',
        OLD.actual_minutes, NEW.actual_minutes,
        OLD.planned_minutes, NEW.planned_minutes,
        OLD.status, NEW.status,
        OLD.notes, NEW.notes,
        auth.uid()
      );
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO timesheet_history (
      timesheet_id, operator_id, work_date, action_type,
      old_actual_minutes, old_planned_minutes, old_status, old_notes,
      changed_by
    ) VALUES (
      OLD.id, OLD.operator_id, OLD.work_date, 'deleted',
      OLD.actual_minutes, OLD.planned_minutes, OLD.status, OLD.notes,
      auth.uid()
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_log_timesheet_change
  AFTER INSERT OR UPDATE OR DELETE ON public.operator_timesheets
  FOR EACH ROW EXECUTE FUNCTION public.log_timesheet_change();

-- ================================================
-- 3. Обновление статусов табеля: добавляем 'on_review' и 'approved'
-- ================================================
-- (Статусы уже text, просто документируем для кода:
--  'pending'/'draft', 'on_review', 'confirmed'/'approved')