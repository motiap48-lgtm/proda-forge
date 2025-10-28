-- Добавление тестовых данных для демонстрации системы

-- Добавляем склады
INSERT INTO public.warehouses (code, name, location, warehouse_type) VALUES
  ('WH-01', 'Основной склад', 'Корпус А', 'main'),
  ('WH-02', 'Склад производства', 'Цех №1', 'production'),
  ('WH-03', 'Склад готовой продукции', 'Корпус Б', 'finished_goods')
ON CONFLICT (code) DO NOTHING;

-- Добавляем продукты/материалы
INSERT INTO public.products (code, name, description, unit, product_type) VALUES
  ('MAT-001', 'Сталь листовая 3мм', 'Лист стальной горячекатаный', 'кг', 'material'),
  ('MAT-002', 'Болт М8х20', 'Болт с шестигранной головкой', 'шт', 'material'),
  ('MAT-003', 'Краска порошковая RAL 9005', 'Черная матовая', 'кг', 'material'),
  ('MAT-004', 'Алюминиевый профиль 40х40', 'Профиль конструкционный', 'м', 'material'),
  ('PROD-001', 'Деталь А-125', 'Корпус защитный', 'шт', 'product'),
  ('PROD-002', 'Узел Б-340', 'Рама опорная', 'шт', 'product'),
  ('PROD-003', 'Компонент В-89', 'Кронштейн крепежный', 'шт', 'product')
ON CONFLICT (code) DO NOTHING;

-- Добавляем рабочие центры
INSERT INTO public.work_centers (code, name, department, capacity_minutes_per_day, efficiency_percent, status) VALUES
  ('WC-001', 'Участок резки металла', 'Цех №1', 480, 85, 'active'),
  ('WC-002', 'Участок механообработки', 'Цех №1', 960, 92, 'active'),
  ('WC-003', 'Участок сварки', 'Цех №2', 480, 78, 'active'),
  ('WC-004', 'Участок покраски', 'Цех №3', 240, 95, 'active')
ON CONFLICT (code) DO NOTHING;

-- Добавляем остатки на складах
INSERT INTO public.inventory (warehouse_id, product_id, quantity, reserved_quantity)
SELECT 
  w.id,
  p.id,
  CASE p.code
    WHEN 'MAT-001' THEN 2500.00
    WHEN 'MAT-002' THEN 5000.00
    WHEN 'MAT-003' THEN 150.00
    WHEN 'MAT-004' THEN 800.00
    WHEN 'PROD-001' THEN 50.00
    WHEN 'PROD-002' THEN 30.00
    WHEN 'PROD-003' THEN 100.00
  END,
  CASE p.code
    WHEN 'MAT-001' THEN 500.00
    WHEN 'MAT-002' THEN 800.00
    WHEN 'MAT-003' THEN 25.00
    WHEN 'MAT-004' THEN 120.00
    ELSE 0.00
  END
FROM public.warehouses w
CROSS JOIN public.products p
WHERE w.code = 'WH-01'
ON CONFLICT (warehouse_id, product_id) DO NOTHING;

-- Добавляем спецификации
INSERT INTO public.specifications (code, product_id, version, is_active)
SELECT 'SPEC-' || p.code, p.id, 'v1', true
FROM public.products p
WHERE p.product_type = 'product'
ON CONFLICT (code) DO NOTHING;

-- Добавляем материалы в спецификации
INSERT INTO public.specification_materials (specification_id, material_id, quantity, waste_rate)
SELECT 
  s.id,
  m.id,
  CASE 
    WHEN s.code = 'SPEC-PROD-001' AND m.code = 'MAT-001' THEN 2.5
    WHEN s.code = 'SPEC-PROD-001' AND m.code = 'MAT-002' THEN 4.0
    WHEN s.code = 'SPEC-PROD-002' AND m.code = 'MAT-004' THEN 1.2
    WHEN s.code = 'SPEC-PROD-003' AND m.code = 'MAT-001' THEN 1.8
  END,
  CASE 
    WHEN m.code = 'MAT-001' THEN 5.0
    WHEN m.code = 'MAT-002' THEN 2.0
    ELSE 3.0
  END
FROM public.specifications s
CROSS JOIN public.products m
WHERE m.product_type = 'material'
  AND (
    (s.code = 'SPEC-PROD-001' AND m.code IN ('MAT-001', 'MAT-002'))
    OR (s.code = 'SPEC-PROD-002' AND m.code = 'MAT-004')
    OR (s.code = 'SPEC-PROD-003' AND m.code = 'MAT-001')
  );

-- Добавляем технологические маршруты
INSERT INTO public.routing_sheets (code, name, product_id, is_active)
SELECT 'RS-' || p.code, 'Техмаршрут: ' || p.name, p.id, true
FROM public.products p
WHERE p.product_type = 'product'
ON CONFLICT (code) DO NOTHING;

-- Добавляем операции в техмаршруты
INSERT INTO public.routing_operations (routing_sheet_id, sequence, name, work_center_id, setup_time_minutes, cycle_time_minutes)
SELECT 
  rs.id,
  10,
  'Резка заготовки',
  wc.id,
  15,
  8.0
FROM public.routing_sheets rs
CROSS JOIN public.work_centers wc
WHERE rs.code LIKE 'RS-PROD-%'
  AND wc.code = 'WC-001';

INSERT INTO public.routing_operations (routing_sheet_id, sequence, name, work_center_id, setup_time_minutes, cycle_time_minutes)
SELECT 
  rs.id,
  20,
  'Механообработка',
  wc.id,
  10,
  12.0
FROM public.routing_sheets rs
CROSS JOIN public.work_centers wc
WHERE rs.code LIKE 'RS-PROD-%'
  AND wc.code = 'WC-002';

-- Добавляем производственные заказы
INSERT INTO public.production_orders (order_number, product_id, specification_id, routing_sheet_id, quantity, completed_quantity, status, priority, planned_start_date, planned_end_date, actual_start_date, work_center_id, responsible_person)
SELECT 
  'PO-2024-001',
  p.id,
  s.id,
  rs.id,
  500,
  325,
  'in_progress',
  'normal',
  '2024-01-15',
  '2024-02-15',
  '2024-01-15',
  wc.id,
  'Иванов И.И.'
FROM public.products p
CROSS JOIN public.specifications s
CROSS JOIN public.routing_sheets rs
CROSS JOIN public.work_centers wc
WHERE p.code = 'PROD-001'
  AND s.code = 'SPEC-PROD-001'
  AND rs.code = 'RS-PROD-001'
  AND wc.code = 'WC-001'
ON CONFLICT (order_number) DO NOTHING;

INSERT INTO public.production_orders (order_number, product_id, quantity, status, priority, planned_start_date, planned_end_date, responsible_person)
SELECT 
  'PO-2024-002',
  p.id,
  200,
  'planned',
  'high',
  '2024-02-01',
  '2024-02-20',
  'Петров П.П.'
FROM public.products p
WHERE p.code = 'PROD-002'
ON CONFLICT (order_number) DO NOTHING;