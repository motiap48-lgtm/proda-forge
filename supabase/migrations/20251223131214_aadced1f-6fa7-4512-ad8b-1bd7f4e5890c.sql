-- Create operator timesheets table for tracking actual worked hours
CREATE TABLE public.operator_timesheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  planned_minutes INTEGER NOT NULL DEFAULT 0,
  actual_minutes INTEGER NOT NULL DEFAULT 0,
  overtime_minutes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'approved')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one entry per operator per date
  UNIQUE(operator_id, work_date)
);

-- Enable RLS
ALTER TABLE public.operator_timesheets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read operator_timesheets"
ON public.operator_timesheets FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert operator_timesheets"
ON public.operator_timesheets FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'production_manager'::app_role)
  )
);

CREATE POLICY "Authorized users can update operator_timesheets"
ON public.operator_timesheets FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'production_manager'::app_role)
  )
);

CREATE POLICY "Authorized users can delete operator_timesheets"
ON public.operator_timesheets FOR DELETE
USING (
  auth.uid() IS NOT NULL AND 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create index for fast lookups
CREATE INDEX idx_operator_timesheets_operator_date ON public.operator_timesheets(operator_id, work_date);
CREATE INDEX idx_operator_timesheets_date ON public.operator_timesheets(work_date);

-- Add trigger for updated_at
CREATE TRIGGER update_operator_timesheets_updated_at
BEFORE UPDATE ON public.operator_timesheets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();