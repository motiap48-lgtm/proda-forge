-- Add original_quantity column to track initial plan
ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS original_quantity numeric;

-- Update existing records to set original_quantity from quantity
UPDATE production_orders 
SET original_quantity = quantity 
WHERE original_quantity IS NULL;

-- Add NOT NULL constraint after data migration
ALTER TABLE production_orders 
ALTER COLUMN original_quantity SET DEFAULT 0;