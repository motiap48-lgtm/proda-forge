-- Function to generate work center code
CREATE OR REPLACE FUNCTION public.generate_work_center_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  prefix text := 'WC-';
  last_number integer;
  next_code text;
BEGIN
  -- Find the maximum number for work centers
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(code FROM '[0-9]+$') AS integer
      )
    ),
    0
  )
  INTO last_number
  FROM work_centers
  WHERE code ~ (prefix || '[0-9]+$');

  -- Generate next code
  next_code := prefix || LPAD((last_number + 1)::text, 3, '0');
  
  RETURN next_code;
END;
$function$;

-- Trigger function to auto-generate work center code
CREATE OR REPLACE FUNCTION public.auto_generate_work_center_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If code is empty or starts with AUTO, generate new code
  IF NEW.code IS NULL OR NEW.code = '' OR NEW.code LIKE 'AUTO%' THEN
    NEW.code := generate_work_center_code();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for automatic code generation
DROP TRIGGER IF EXISTS trigger_auto_generate_work_center_code ON work_centers;
CREATE TRIGGER trigger_auto_generate_work_center_code
  BEFORE INSERT ON work_centers
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_work_center_code();