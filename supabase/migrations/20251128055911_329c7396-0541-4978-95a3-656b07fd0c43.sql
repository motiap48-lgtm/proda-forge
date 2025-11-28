-- Add has_no_specification flag to specifications table
ALTER TABLE public.specifications 
ADD COLUMN has_no_specification BOOLEAN NOT NULL DEFAULT false;

-- Create index for filtering specifications without components
CREATE INDEX idx_specifications_has_no_specification 
ON public.specifications(has_no_specification);