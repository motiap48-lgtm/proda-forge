-- Add reduction_hours field to calendar_exceptions
-- This field represents how many hours to reduce from the normal schedule
-- Default is 1 hour (standard reduction for pre-holiday days in Russia)
ALTER TABLE public.calendar_exceptions 
ADD COLUMN IF NOT EXISTS reduction_hours numeric DEFAULT 1;

-- Add comment for clarity
COMMENT ON COLUMN public.calendar_exceptions.reduction_hours IS 'Number of hours to reduce from normal work schedule on shortened days. Default is 1 hour.';

-- Update existing shortened_day records to have reduction_hours = 1 if not set
UPDATE public.calendar_exceptions 
SET reduction_hours = 1 
WHERE exception_type = 'shortened_day' AND reduction_hours IS NULL;