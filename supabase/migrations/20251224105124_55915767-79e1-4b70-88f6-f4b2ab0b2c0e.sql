-- Add status field to compensation_records for confirmation workflow
ALTER TABLE public.compensation_records 
ADD COLUMN status text NOT NULL DEFAULT 'pending';

-- Add comment explaining the field
COMMENT ON COLUMN public.compensation_records.status IS 'Status of compensation record: pending (scheduled), confirmed (verified after completion)';