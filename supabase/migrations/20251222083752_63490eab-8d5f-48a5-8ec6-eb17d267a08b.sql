-- Add column to store original cycle start date before override was applied
ALTER TABLE operator_schedule_overrides 
ADD COLUMN original_cycle_start_date DATE NULL;