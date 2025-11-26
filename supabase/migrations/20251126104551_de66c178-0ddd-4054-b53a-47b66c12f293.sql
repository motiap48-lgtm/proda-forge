-- Create function to generate specification code
CREATE OR REPLACE FUNCTION public.generate_specification_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prefix text := 'SPEC-';
  last_number integer;
  next_code text;
BEGIN
  -- Find the maximum number for specifications
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(code FROM '[0-9]+$') AS integer
      )
    ),
    0
  )
  INTO last_number
  FROM specifications
  WHERE is_active = true
    AND code ~ (prefix || '[0-9]+$');

  -- Generate next code
  next_code := prefix || LPAD((last_number + 1)::text, 3, '0');
  
  RETURN next_code;
END;
$$;

-- Create trigger function for auto-generating specification code
CREATE OR REPLACE FUNCTION public.auto_generate_specification_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If code is empty or starts with AUTO, generate new code
  IF NEW.code IS NULL OR NEW.code = '' OR NEW.code LIKE 'AUTO%' THEN
    NEW.code := generate_specification_code();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate specification code on insert
CREATE TRIGGER trigger_auto_generate_specification_code
  BEFORE INSERT ON public.specifications
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_specification_code();