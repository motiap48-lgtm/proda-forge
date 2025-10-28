-- Создание таблиц для ERP системы производства

-- Таблица продуктов/номенклатуры
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'шт',
  product_type TEXT NOT NULL DEFAULT 'material', -- material, product, component
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица складов
CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location TEXT,
  warehouse_type TEXT NOT NULL DEFAULT 'main', -- main, production, finished_goods
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица остатков на складах
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
  reserved_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
  available_quantity DECIMAL(15,3) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(warehouse_id, product_id)
);

-- Таблица рабочих центров
CREATE TABLE IF NOT EXISTS public.work_centers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  department TEXT,
  capacity_minutes_per_day INTEGER NOT NULL DEFAULT 480,
  efficiency_percent INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'active', -- active, maintenance, inactive
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица спецификаций (BOM)
CREATE TABLE IF NOT EXISTS public.specifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  version TEXT NOT NULL DEFAULT 'v1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица материалов в спецификациях
CREATE TABLE IF NOT EXISTS public.specification_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specification_id UUID NOT NULL REFERENCES public.specifications(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity DECIMAL(15,3) NOT NULL,
  waste_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица технологических маршрутов
CREATE TABLE IF NOT EXISTS public.routing_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица операций в техмаршрутах
CREATE TABLE IF NOT EXISTS public.routing_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  routing_sheet_id UUID NOT NULL REFERENCES public.routing_sheets(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  name TEXT NOT NULL,
  work_center_id UUID NOT NULL REFERENCES public.work_centers(id) ON DELETE CASCADE,
  setup_time_minutes INTEGER NOT NULL DEFAULT 0,
  cycle_time_minutes DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица производственных заказов
CREATE TABLE IF NOT EXISTS public.production_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  specification_id UUID REFERENCES public.specifications(id),
  routing_sheet_id UUID REFERENCES public.routing_sheets(id),
  quantity DECIMAL(15,3) NOT NULL,
  completed_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned', -- planned, in_progress, completed, cancelled
  priority TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  planned_start_date DATE NOT NULL,
  planned_end_date DATE NOT NULL,
  actual_start_date DATE,
  actual_end_date DATE,
  work_center_id UUID REFERENCES public.work_centers(id),
  responsible_person TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица резервирований материалов
CREATE TABLE IF NOT EXISTS public.material_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  production_order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  reserved_quantity DECIMAL(15,3) NOT NULL,
  issued_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'reserved', -- reserved, issued, cancelled
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица выдачи материалов
CREATE TABLE IF NOT EXISTS public.material_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_number TEXT NOT NULL UNIQUE,
  production_order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, issued, cancelled
  issued_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица строк выдачи материалов
CREATE TABLE IF NOT EXISTS public.material_issue_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_issue_id UUID NOT NULL REFERENCES public.material_issues(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity DECIMAL(15,3) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specification_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_issue_lines ENABLE ROW LEVEL SECURITY;

-- Создаем политики для общедоступного чтения (пока без auth)
-- В будущем можно будет добавить проверку auth.uid()

CREATE POLICY "Allow public read access on products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on products" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on products" ON public.products FOR DELETE USING (true);

CREATE POLICY "Allow public read access on warehouses" ON public.warehouses FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on warehouses" ON public.warehouses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on warehouses" ON public.warehouses FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on warehouses" ON public.warehouses FOR DELETE USING (true);

CREATE POLICY "Allow public read access on inventory" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on inventory" ON public.inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on inventory" ON public.inventory FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on inventory" ON public.inventory FOR DELETE USING (true);

CREATE POLICY "Allow public read access on work_centers" ON public.work_centers FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on work_centers" ON public.work_centers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on work_centers" ON public.work_centers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on work_centers" ON public.work_centers FOR DELETE USING (true);

CREATE POLICY "Allow public read access on specifications" ON public.specifications FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on specifications" ON public.specifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on specifications" ON public.specifications FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on specifications" ON public.specifications FOR DELETE USING (true);

CREATE POLICY "Allow public read access on specification_materials" ON public.specification_materials FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on specification_materials" ON public.specification_materials FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on specification_materials" ON public.specification_materials FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on specification_materials" ON public.specification_materials FOR DELETE USING (true);

CREATE POLICY "Allow public read access on routing_sheets" ON public.routing_sheets FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on routing_sheets" ON public.routing_sheets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on routing_sheets" ON public.routing_sheets FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on routing_sheets" ON public.routing_sheets FOR DELETE USING (true);

CREATE POLICY "Allow public read access on routing_operations" ON public.routing_operations FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on routing_operations" ON public.routing_operations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on routing_operations" ON public.routing_operations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on routing_operations" ON public.routing_operations FOR DELETE USING (true);

CREATE POLICY "Allow public read access on production_orders" ON public.production_orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on production_orders" ON public.production_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on production_orders" ON public.production_orders FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on production_orders" ON public.production_orders FOR DELETE USING (true);

CREATE POLICY "Allow public read access on material_reservations" ON public.material_reservations FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on material_reservations" ON public.material_reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on material_reservations" ON public.material_reservations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on material_reservations" ON public.material_reservations FOR DELETE USING (true);

CREATE POLICY "Allow public read access on material_issues" ON public.material_issues FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on material_issues" ON public.material_issues FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on material_issues" ON public.material_issues FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on material_issues" ON public.material_issues FOR DELETE USING (true);

CREATE POLICY "Allow public read access on material_issue_lines" ON public.material_issue_lines FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on material_issue_lines" ON public.material_issue_lines FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on material_issue_lines" ON public.material_issue_lines FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on material_issue_lines" ON public.material_issue_lines FOR DELETE USING (true);

-- Создаем функцию для обновления updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггеры для автоматического обновления updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_work_centers_updated_at BEFORE UPDATE ON public.work_centers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_specifications_updated_at BEFORE UPDATE ON public.specifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_routing_sheets_updated_at BEFORE UPDATE ON public.routing_sheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_production_orders_updated_at BEFORE UPDATE ON public.production_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_material_reservations_updated_at BEFORE UPDATE ON public.material_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_material_issues_updated_at BEFORE UPDATE ON public.material_issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Создаем индексы для производительности
CREATE INDEX idx_inventory_warehouse_product ON public.inventory(warehouse_id, product_id);
CREATE INDEX idx_production_orders_status ON public.production_orders(status);
CREATE INDEX idx_material_reservations_order ON public.material_reservations(production_order_id);
CREATE INDEX idx_specification_materials_spec ON public.specification_materials(specification_id);
CREATE INDEX idx_routing_operations_sheet ON public.routing_operations(routing_sheet_id);