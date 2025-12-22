-- Create table for operator schedule day overrides
-- This allows managers to override the default schedule for specific days
CREATE TABLE public.operator_schedule_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  is_working_day BOOLEAN NOT NULL DEFAULT true,
  shift_number INTEGER,
  reason TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(operator_id, override_date)
);

-- Enable RLS
ALTER TABLE public.operator_schedule_overrides ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read schedule overrides"
ON public.operator_schedule_overrides
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert schedule overrides"
ON public.operator_schedule_overrides
FOR INSERT
WITH CHECK ((auth.uid() IS NOT NULL) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'production_manager'::app_role)));

CREATE POLICY "Authorized users can update schedule overrides"
ON public.operator_schedule_overrides
FOR UPDATE
USING ((auth.uid() IS NOT NULL) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'production_manager'::app_role)));

CREATE POLICY "Authorized users can delete schedule overrides"
ON public.operator_schedule_overrides
FOR DELETE
USING ((auth.uid() IS NOT NULL) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'production_manager'::app_role)));

-- Create index for faster lookups
CREATE INDEX idx_operator_schedule_overrides_operator_date ON public.operator_schedule_overrides(operator_id, override_date);
CREATE INDEX idx_operator_schedule_overrides_date ON public.operator_schedule_overrides(override_date);