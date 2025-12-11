-- Add sort_order column to routing_sheets for manual ordering
ALTER TABLE public.routing_sheets 
ADD COLUMN sort_order integer DEFAULT 0;

-- Initialize sort_order based on created_at to preserve existing order
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.routing_sheets
)
UPDATE public.routing_sheets rs
SET sort_order = ordered.rn
FROM ordered
WHERE rs.id = ordered.id;