-- Enable realtime for production order operations
ALTER PUBLICATION supabase_realtime ADD TABLE public.production_order_operations;

-- Enable realtime for production orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.production_orders;

-- Enable realtime for production order history
ALTER PUBLICATION supabase_realtime ADD TABLE public.production_order_history;