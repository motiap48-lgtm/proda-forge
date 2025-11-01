-- Создаем таблицу для оборудования
CREATE TABLE public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  work_center_id uuid NOT NULL REFERENCES public.work_centers(id) ON DELETE CASCADE,
  equipment_type text NOT NULL DEFAULT 'machine' CHECK (equipment_type IN ('machine', 'tool', 'fixture', 'other')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'broken', 'inactive')),
  manufacturer text,
  model text,
  serial_number text,
  purchase_date date,
  last_maintenance_date date,
  next_maintenance_date date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Политики для equipment
CREATE POLICY "Allow public read access on equipment"
ON public.equipment FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access on equipment"
ON public.equipment FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update access on equipment"
ON public.equipment FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete access on equipment"
ON public.equipment FOR DELETE
USING (true);

-- Триггер для обновления updated_at
CREATE TRIGGER update_equipment_updated_at
BEFORE UPDATE ON public.equipment
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Создаем индексы
CREATE INDEX idx_equipment_work_center_id ON public.equipment(work_center_id);
CREATE INDEX idx_equipment_status ON public.equipment(status);