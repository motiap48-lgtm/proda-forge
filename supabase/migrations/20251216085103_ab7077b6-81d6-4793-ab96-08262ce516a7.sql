-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  inn TEXT,
  kpp TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "Authenticated users can read customers" 
ON public.customers FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert customers" 
ON public.customers FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'production_manager'::app_role)
  )
);

CREATE POLICY "Authorized users can update customers" 
ON public.customers FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'production_manager'::app_role)
  )
);

CREATE POLICY "Authorized users can delete customers" 
ON public.customers FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Auto-generate customer code
CREATE OR REPLACE FUNCTION public.generate_customer_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prefix TEXT := 'CUS-';
  last_number INTEGER;
  next_code TEXT;
BEGIN
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(code FROM '[0-9]+$') AS INTEGER)), 0
  )
  INTO last_number
  FROM customers
  WHERE code ~ (prefix || '[0-9]+$');

  next_code := prefix || LPAD((last_number + 1)::TEXT, 3, '0');
  RETURN next_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_customer_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' OR NEW.code LIKE 'AUTO%' THEN
    NEW.code := generate_customer_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_generate_customer_code
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_customer_code();

-- Add updated_at trigger
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add customer_id to production_orders
ALTER TABLE public.production_orders 
ADD COLUMN customer_id UUID REFERENCES public.customers(id);

-- Create index for performance
CREATE INDEX idx_production_orders_customer_id ON public.production_orders(customer_id);