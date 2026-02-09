
-- Drop existing check constraint
ALTER TABLE operator_timesheets DROP CONSTRAINT operator_timesheets_status_check;

-- Add new check constraint with all statuses
ALTER TABLE operator_timesheets ADD CONSTRAINT operator_timesheets_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'draft'::text, 'on_review'::text, 'confirmed'::text, 'approved'::text]));
