-- Create material_categories table for user-defined categories
CREATE TABLE IF NOT EXISTS public.material_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.material_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for material_categories
CREATE POLICY "Allow public read access on material_categories"
  ON public.material_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access on material_categories"
  ON public.material_categories
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access on material_categories"
  ON public.material_categories
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete access on material_categories"
  ON public.material_categories
  FOR DELETE
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_material_categories_updated_at
  BEFORE UPDATE ON public.material_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.material_categories (name, description) VALUES
  ('Крепеж', 'Болты, гайки, винты, шайбы'),
  ('Фурнитура', 'Ручки, петли, замки'),
  ('Электрика', 'Провода, разъемы, выключатели'),
  ('Метизы', 'Металлические изделия'),
  ('Расходные материалы', 'Клей, краска, лак')
ON CONFLICT (name) DO NOTHING;