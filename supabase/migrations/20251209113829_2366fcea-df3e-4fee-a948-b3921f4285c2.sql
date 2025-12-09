-- Справочник типовых операций
CREATE TABLE public.standard_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  operation_type TEXT NOT NULL DEFAULT 'production',
  description TEXT,
  default_setup_time_minutes INTEGER DEFAULT 0,
  default_cycle_time_minutes NUMERIC DEFAULT 0,
  default_work_center_id UUID REFERENCES public.work_centers(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.standard_operations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow public read access on standard_operations" 
  ON public.standard_operations FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on standard_operations" 
  ON public.standard_operations FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on standard_operations" 
  ON public.standard_operations FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on standard_operations" 
  ON public.standard_operations FOR DELETE USING (true);

-- Auto-generate code function
CREATE OR REPLACE FUNCTION public.generate_standard_operation_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  prefix text := 'OP-';
  last_number integer;
  next_code text;
BEGIN
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(code FROM '[0-9]+$') AS integer)), 0
  )
  INTO last_number
  FROM standard_operations
  WHERE code ~ (prefix || '[0-9]+$');

  next_code := prefix || LPAD((last_number + 1)::text, 3, '0');
  RETURN next_code;
END;
$$;

-- Auto-generate trigger
CREATE OR REPLACE FUNCTION public.auto_generate_standard_operation_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' OR NEW.code LIKE 'AUTO%' THEN
    NEW.code := generate_standard_operation_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_generate_standard_operation_code
  BEFORE INSERT ON public.standard_operations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_standard_operation_code();

-- Update timestamp trigger
CREATE TRIGGER update_standard_operations_updated_at
  BEFORE UPDATE ON public.standard_operations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add optional reference to standard operation in routing_operations
ALTER TABLE public.routing_operations 
  ADD COLUMN standard_operation_id UUID REFERENCES public.standard_operations(id);