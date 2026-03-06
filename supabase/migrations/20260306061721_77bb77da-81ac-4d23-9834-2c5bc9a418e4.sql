
-- Auto-generate inspection_number for quality_inspections
CREATE OR REPLACE FUNCTION public.auto_generate_inspection_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.inspection_number IS NULL OR NEW.inspection_number = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(inspection_number FROM 'QC-(\d+)') AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.quality_inspections;
    NEW.inspection_number := 'QC-' || LPAD(next_num::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_generate_inspection_number ON public.quality_inspections;
CREATE TRIGGER trigger_auto_generate_inspection_number
  BEFORE INSERT ON public.quality_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_inspection_number();

-- Auto-generate code for defect_types
CREATE OR REPLACE FUNCTION public.auto_generate_defect_type_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 'DEF-(\d+)') AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.defect_types;
    NEW.code := 'DEF-' || LPAD(next_num::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_generate_defect_type_code ON public.defect_types;
CREATE TRIGGER trigger_auto_generate_defect_type_code
  BEFORE INSERT ON public.defect_types
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_defect_type_code();
