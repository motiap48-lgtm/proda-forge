-- Add external operation support for outsourced operations
ALTER TABLE public.routing_operations
ADD COLUMN is_external boolean NOT NULL DEFAULT false,
ADD COLUMN external_contractor text DEFAULT NULL;

-- Make work_center_id nullable for external operations
ALTER TABLE public.routing_operations
ALTER COLUMN work_center_id DROP NOT NULL;

COMMENT ON COLUMN public.routing_operations.is_external IS 'Flag indicating operation is performed by external contractor';
COMMENT ON COLUMN public.routing_operations.external_contractor IS 'Name of external contractor organization';