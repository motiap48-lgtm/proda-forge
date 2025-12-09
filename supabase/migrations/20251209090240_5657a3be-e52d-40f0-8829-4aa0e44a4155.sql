-- Create table for linking routing operations to specification materials
CREATE TABLE public.routing_operation_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  routing_operation_id UUID NOT NULL REFERENCES public.routing_operations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_per_operation NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.routing_operation_materials ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access on routing_operation_materials" 
ON public.routing_operation_materials 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access on routing_operation_materials" 
ON public.routing_operation_materials 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access on routing_operation_materials" 
ON public.routing_operation_materials 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access on routing_operation_materials" 
ON public.routing_operation_materials 
FOR DELETE 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_routing_operation_materials_operation_id ON public.routing_operation_materials(routing_operation_id);
CREATE INDEX idx_routing_operation_materials_product_id ON public.routing_operation_materials(product_id);