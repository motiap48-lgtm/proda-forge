-- Add power consumption column to equipment table
ALTER TABLE public.equipment 
ADD COLUMN power_consumption_kwh numeric DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.equipment.power_consumption_kwh IS 'Power consumption in kWh';