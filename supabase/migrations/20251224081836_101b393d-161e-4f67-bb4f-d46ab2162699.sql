-- Migrate old administrative_leave records to the new type without compensation
UPDATE public.operator_absences 
SET absence_type = 'administrative_leave_without_compensation'
WHERE absence_type = 'administrative_leave';