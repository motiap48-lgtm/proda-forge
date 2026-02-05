-- Create table for brigade member history
CREATE TABLE public.brigade_member_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brigade_id UUID NOT NULL REFERENCES public.brigades(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('added', 'removed', 'role_changed', 'reactivated')),
  old_role TEXT,
  new_role TEXT,
  changed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX idx_brigade_member_history_brigade_id ON brigade_member_history(brigade_id);
CREATE INDEX idx_brigade_member_history_operator_id ON brigade_member_history(operator_id);
CREATE INDEX idx_brigade_member_history_created_at ON brigade_member_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.brigade_member_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read brigade_member_history"
  ON public.brigade_member_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert brigade_member_history"
  ON public.brigade_member_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'production_manager'::app_role)
  ));

-- Create trigger function to log changes
CREATE OR REPLACE FUNCTION public.log_brigade_member_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO brigade_member_history (brigade_id, operator_id, action_type, new_role, changed_by)
    VALUES (NEW.brigade_id, NEW.operator_id, 'added', NEW.role, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if role changed
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      INSERT INTO brigade_member_history (brigade_id, operator_id, action_type, old_role, new_role, changed_by)
      VALUES (NEW.brigade_id, NEW.operator_id, 'role_changed', OLD.role, NEW.role, auth.uid());
    END IF;
    -- Check if reactivated
    IF OLD.is_active = false AND NEW.is_active = true THEN
      INSERT INTO brigade_member_history (brigade_id, operator_id, action_type, new_role, changed_by)
      VALUES (NEW.brigade_id, NEW.operator_id, 'reactivated', NEW.role, auth.uid());
    END IF;
    -- Check if removed (deactivated)
    IF OLD.is_active = true AND NEW.is_active = false THEN
      INSERT INTO brigade_member_history (brigade_id, operator_id, action_type, old_role, changed_by)
      VALUES (NEW.brigade_id, NEW.operator_id, 'removed', OLD.role, auth.uid());
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO brigade_member_history (brigade_id, operator_id, action_type, old_role, changed_by)
    VALUES (OLD.brigade_id, OLD.operator_id, 'removed', OLD.role, auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger on brigade_members table
CREATE TRIGGER trigger_log_brigade_member_change
  AFTER INSERT OR UPDATE OR DELETE ON public.brigade_members
  FOR EACH ROW
  EXECUTE FUNCTION public.log_brigade_member_change();

-- Add comment
COMMENT ON TABLE public.brigade_member_history IS 'Tracks all changes to brigade membership including additions, removals, and role changes';