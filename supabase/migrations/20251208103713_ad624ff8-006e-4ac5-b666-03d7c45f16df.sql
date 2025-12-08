-- Function to generate routing sheet code
CREATE OR REPLACE FUNCTION public.generate_routing_sheet_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  prefix text := 'RS-';
  last_number integer;
  next_code text;
BEGIN
  -- Find the maximum number for routing sheets
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(code FROM '[0-9]+$') AS integer
      )
    ),
    0
  )
  INTO last_number
  FROM routing_sheets
  WHERE code ~ (prefix || '[0-9]+$');

  -- Generate next code
  next_code := prefix || LPAD((last_number + 1)::text, 3, '0');
  
  RETURN next_code;
END;
$function$;

-- Trigger function to auto-generate routing sheet code
CREATE OR REPLACE FUNCTION public.auto_generate_routing_sheet_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If code is empty or starts with AUTO, generate new code
  IF NEW.code IS NULL OR NEW.code = '' OR NEW.code LIKE 'AUTO%' THEN
    NEW.code := generate_routing_sheet_code();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for routing sheets auto-generation
DROP TRIGGER IF EXISTS trigger_auto_generate_routing_sheet_code ON routing_sheets;
CREATE TRIGGER trigger_auto_generate_routing_sheet_code
  BEFORE INSERT ON routing_sheets
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_routing_sheet_code();

-- Function to generate warehouse code
CREATE OR REPLACE FUNCTION public.generate_warehouse_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  prefix text := 'WH-';
  last_number integer;
  next_code text;
BEGIN
  -- Find the maximum number for warehouses
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(code FROM '[0-9]+$') AS integer
      )
    ),
    0
  )
  INTO last_number
  FROM warehouses
  WHERE code ~ (prefix || '[0-9]+$');

  -- Generate next code
  next_code := prefix || LPAD((last_number + 1)::text, 3, '0');
  
  RETURN next_code;
END;
$function$;

-- Trigger function to auto-generate warehouse code
CREATE OR REPLACE FUNCTION public.auto_generate_warehouse_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If code is empty or starts with AUTO, generate new code
  IF NEW.code IS NULL OR NEW.code = '' OR NEW.code LIKE 'AUTO%' THEN
    NEW.code := generate_warehouse_code();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for warehouses auto-generation
DROP TRIGGER IF EXISTS trigger_auto_generate_warehouse_code ON warehouses;
CREATE TRIGGER trigger_auto_generate_warehouse_code
  BEFORE INSERT ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_warehouse_code();