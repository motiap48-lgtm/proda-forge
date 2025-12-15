-- Add parent_order_id column to production_orders for order hierarchy
ALTER TABLE public.production_orders 
ADD COLUMN parent_order_id uuid REFERENCES public.production_orders(id) ON DELETE SET NULL;

-- Add index for faster hierarchy queries
CREATE INDEX idx_production_orders_parent_order_id ON public.production_orders(parent_order_id);

-- Add comment for documentation
COMMENT ON COLUMN public.production_orders.parent_order_id IS 'Reference to parent production order for hierarchical tracking of ПФ/СБ orders';