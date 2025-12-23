-- Add reduced_hours column for shortened days
ALTER TABLE public.calendar_exceptions
ADD COLUMN reduced_hours numeric DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.calendar_exceptions.reduced_hours IS 'Number of working hours for shortened days';