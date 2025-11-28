-- Add category field to products table
ALTER TABLE public.products 
ADD COLUMN category text;

-- Add comment to explain the purpose
COMMENT ON COLUMN public.products.category IS 'Product category for grouping materials (e.g., fasteners, hardware, electrical, etc.)';

-- Create index for better query performance when filtering by category
CREATE INDEX idx_products_category ON public.products(category) WHERE category IS NOT NULL;