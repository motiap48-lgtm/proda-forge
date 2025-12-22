-- Create operator absences table for tracking leave, sick days, etc.
CREATE TABLE public.operator_absences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  absence_type TEXT NOT NULL CHECK (absence_type IN ('annual_leave', 'sick_leave', 'administrative_leave', 'maternity_leave', 'unpaid_leave', 'business_trip', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Enable RLS
ALTER TABLE public.operator_absences ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view all operator absences"
ON public.operator_absences
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create operator absences"
ON public.operator_absences
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update operator absences"
ON public.operator_absences
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Users can delete operator absences"
ON public.operator_absences
FOR DELETE
TO authenticated
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_operator_absences_operator_id ON public.operator_absences(operator_id);
CREATE INDEX idx_operator_absences_dates ON public.operator_absences(start_date, end_date);
CREATE INDEX idx_operator_absences_status ON public.operator_absences(status);

-- Add trigger for updated_at
CREATE TRIGGER update_operator_absences_updated_at
BEFORE UPDATE ON public.operator_absences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add termination_date to operators table for tracking when employees left
ALTER TABLE public.operators ADD COLUMN IF NOT EXISTS termination_date DATE;

-- Add comment for clarity
COMMENT ON TABLE public.operator_absences IS 'Tracks operator absences including annual leave, sick leave, administrative leave, etc.';