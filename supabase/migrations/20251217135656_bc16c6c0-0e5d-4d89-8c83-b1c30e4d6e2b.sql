-- Add shift assignment and rotation fields to operators
ALTER TABLE public.operators
ADD COLUMN assigned_shift_number INTEGER DEFAULT NULL,
ADD COLUMN shift_rotation_enabled BOOLEAN DEFAULT false,
ADD COLUMN shift_rotation_start_date DATE DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.operators.assigned_shift_number IS 'The shift number the operator is assigned to (from work_schedule_shifts)';
COMMENT ON COLUMN public.operators.shift_rotation_enabled IS 'Whether the operator rotates between shifts weekly';
COMMENT ON COLUMN public.operators.shift_rotation_start_date IS 'The date when the operator started on shift 1 (for rotation calculation)';