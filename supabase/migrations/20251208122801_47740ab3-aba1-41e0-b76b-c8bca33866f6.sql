-- Add operation_type column to routing_operations
ALTER TABLE public.routing_operations 
ADD COLUMN operation_type TEXT NOT NULL DEFAULT 'production';

-- Add check constraint for valid operation types
ALTER TABLE public.routing_operations 
ADD CONSTRAINT routing_operations_type_check 
CHECK (operation_type IN ('production', 'transport', 'control', 'setup'));