-- Add reduction_hours column to work_schedules for schedule-specific shortened day reduction
ALTER TABLE public.work_schedules 
ADD COLUMN IF NOT EXISTS reduction_hours numeric DEFAULT 1;

-- Add comment
COMMENT ON COLUMN public.work_schedules.reduction_hours IS 'Hours to reduce on shortened days (e.g., 1 hour for 12h shifts, 1 hour for 8h shifts)';

-- Update existing schedules based on typical patterns
-- Cyclic schedules (2/2, 3/3 etc.) typically have 12-hour shifts, reduce by 1 hour
-- Standard 5/2 schedules with 8-hour shifts also reduce by 1 hour by default