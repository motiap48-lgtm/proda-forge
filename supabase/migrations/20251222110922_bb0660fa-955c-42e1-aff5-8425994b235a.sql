-- Drop the existing constraint
ALTER TABLE public.operator_absences DROP CONSTRAINT IF EXISTS operator_absences_absence_type_check;

-- Add the updated constraint with unauthorized_absence type
ALTER TABLE public.operator_absences ADD CONSTRAINT operator_absences_absence_type_check 
CHECK (absence_type = ANY (ARRAY['annual_leave'::text, 'sick_leave'::text, 'administrative_leave'::text, 'maternity_leave'::text, 'unpaid_leave'::text, 'business_trip'::text, 'unauthorized_absence'::text, 'other'::text]));