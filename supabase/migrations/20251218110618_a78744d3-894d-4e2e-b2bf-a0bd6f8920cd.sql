-- Add cycle_start_date field to work_schedules table
ALTER TABLE public.work_schedules 
ADD COLUMN cycle_start_date DATE DEFAULT '2024-01-01';

-- Create calendar_exceptions table for holidays
CREATE TABLE public.calendar_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exception_date DATE NOT NULL UNIQUE,
  exception_type TEXT NOT NULL DEFAULT 'holiday',
  name TEXT NOT NULL,
  description TEXT,
  is_working_day BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comment
COMMENT ON TABLE public.calendar_exceptions IS 'Production calendar exceptions - holidays and special working days';
COMMENT ON COLUMN public.calendar_exceptions.exception_type IS 'Type: holiday, shortened_day, extra_working_day';
COMMENT ON COLUMN public.calendar_exceptions.is_working_day IS 'If true - this is a working day, if false - day off';

-- Enable RLS
ALTER TABLE public.calendar_exceptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view calendar exceptions"
ON public.calendar_exceptions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin and managers can manage calendar exceptions"
ON public.calendar_exceptions FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'production_manager')
);

-- Create trigger for updated_at
CREATE TRIGGER update_calendar_exceptions_updated_at
BEFORE UPDATE ON public.calendar_exceptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert Russian holidays for 2025
INSERT INTO public.calendar_exceptions (exception_date, exception_type, name) VALUES
('2025-01-01', 'holiday', 'Новый год'),
('2025-01-02', 'holiday', 'Новогодние каникулы'),
('2025-01-03', 'holiday', 'Новогодние каникулы'),
('2025-01-06', 'holiday', 'Новогодние каникулы'),
('2025-01-07', 'holiday', 'Рождество Христово'),
('2025-01-08', 'holiday', 'Новогодние каникулы'),
('2025-02-23', 'holiday', 'День защитника Отечества'),
('2025-03-08', 'holiday', 'Международный женский день'),
('2025-05-01', 'holiday', 'Праздник Весны и Труда'),
('2025-05-09', 'holiday', 'День Победы'),
('2025-06-12', 'holiday', 'День России'),
('2025-11-04', 'holiday', 'День народного единства');