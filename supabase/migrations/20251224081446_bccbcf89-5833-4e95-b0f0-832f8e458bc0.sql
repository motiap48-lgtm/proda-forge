-- Drop existing check constraint and add updated one with new absence types
ALTER TABLE public.operator_absences DROP CONSTRAINT IF EXISTS operator_absences_absence_type_check;

ALTER TABLE public.operator_absences ADD CONSTRAINT operator_absences_absence_type_check 
CHECK (absence_type IN (
  'annual_leave',
  'sick_leave',
  'administrative_leave',
  'administrative_leave_with_compensation',
  'administrative_leave_without_compensation',
  'maternity_leave',
  'unpaid_leave',
  'business_trip',
  'unauthorized_absence',
  'other'
));