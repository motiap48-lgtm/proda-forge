-- Create contractors directory table
CREATE TABLE public.contractors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL,
  name text NOT NULL,
  inn text DEFAULT NULL,
  contact_person text DEFAULT NULL,
  phone text DEFAULT NULL,
  email text DEFAULT NULL,
  address text DEFAULT NULL,
  notes text DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add unique constraint on code
ALTER TABLE public.contractors ADD CONSTRAINT contractors_code_key UNIQUE (code);

-- Enable RLS
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read access on contractors" ON public.contractors FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on contractors" ON public.contractors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on contractors" ON public.contractors FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on contractors" ON public.contractors FOR DELETE USING (true);

-- Create auto-generate code function
CREATE OR REPLACE FUNCTION public.generate_contractor_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  prefix text := 'CTR-';
  last_number integer;
  next_code text;
BEGIN
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(code FROM '[0-9]+$') AS integer)), 0
  )
  INTO last_number
  FROM contractors
  WHERE code ~ (prefix || '[0-9]+$');

  next_code := prefix || LPAD((last_number + 1)::text, 3, '0');
  RETURN next_code;
END;
$function$;

-- Create trigger for auto code generation
CREATE OR REPLACE FUNCTION public.auto_generate_contractor_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' OR NEW.code LIKE 'AUTO%' THEN
    NEW.code := generate_contractor_code();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_auto_generate_contractor_code
BEFORE INSERT ON public.contractors
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_contractor_code();

-- Add contractor_id foreign key to routing_operations
ALTER TABLE public.routing_operations 
ADD COLUMN contractor_id uuid DEFAULT NULL REFERENCES public.contractors(id);

-- Add lead time tracking for external operations
ALTER TABLE public.routing_operations 
ADD COLUMN external_lead_time_days integer DEFAULT NULL;

-- Add planned dates for production order operations (external tracking)
ALTER TABLE public.production_order_operations 
ADD COLUMN external_planned_date date DEFAULT NULL,
ADD COLUMN external_actual_date date DEFAULT NULL;

COMMENT ON TABLE public.contractors IS 'Directory of external contractors for outsourced operations';
COMMENT ON COLUMN public.routing_operations.contractor_id IS 'Reference to contractor for external operations';
COMMENT ON COLUMN public.routing_operations.external_lead_time_days IS 'Lead time in days for external operations';
COMMENT ON COLUMN public.production_order_operations.external_planned_date IS 'Planned completion date for external operation';
COMMENT ON COLUMN public.production_order_operations.external_actual_date IS 'Actual completion date for external operation';