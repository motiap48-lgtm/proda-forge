-- Drop the existing check constraint
ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_equipment_type_check;

-- Add new check constraint with welding type
ALTER TABLE equipment ADD CONSTRAINT equipment_equipment_type_check 
CHECK (equipment_type IN ('machine', 'welding', 'tool', 'fixture', 'other'));