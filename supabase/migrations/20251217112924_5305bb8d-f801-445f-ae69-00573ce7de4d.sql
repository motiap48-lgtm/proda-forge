-- =============================================
-- СИСТЕМА РЕСУРСНОГО ПЛАНИРОВАНИЯ
-- =============================================

-- 1. Графики работы (шаблоны)
CREATE TABLE public.work_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  schedule_type TEXT NOT NULL DEFAULT 'shift', -- 'shift' (сменный), 'weekly' (пятидневка), 'custom' (произвольный)
  cycle_days_on INTEGER NOT NULL DEFAULT 2, -- рабочих дней в цикле
  cycle_days_off INTEGER NOT NULL DEFAULT 2, -- выходных дней в цикле
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Смены в графике
CREATE TABLE public.work_schedule_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_schedule_id UUID NOT NULL REFERENCES public.work_schedules(id) ON DELETE CASCADE,
  shift_name TEXT NOT NULL, -- "Дневная", "Ночная", etc.
  shift_number INTEGER NOT NULL DEFAULT 1, -- порядковый номер смены
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '20:00',
  gross_work_minutes INTEGER NOT NULL DEFAULT 720, -- общее время смены
  break_minutes INTEGER NOT NULL DEFAULT 50, -- суммарные перерывы (обед + регламентируемые)
  net_work_minutes INTEGER GENERATED ALWAYS AS (gross_work_minutes - break_minutes) STORED, -- чистое рабочее время
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Перерывы в сменах (детализация)
CREATE TABLE public.work_schedule_breaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES public.work_schedule_shifts(id) ON DELETE CASCADE,
  break_name TEXT NOT NULL, -- "Обед", "Регламентируемый перерыв 1", etc.
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Операторы (справочник сотрудников производства)
CREATE TABLE public.operators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  position TEXT, -- должность: "Оператор станка", "Сборщик", etc.
  employee_type TEXT NOT NULL DEFAULT 'operator', -- 'operator' (станочник), 'assembler' (сборщик), 'universal' (универсал)
  default_work_center_id UUID REFERENCES public.work_centers(id),
  work_schedule_id UUID REFERENCES public.work_schedules(id),
  phone TEXT,
  email TEXT,
  hire_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Навыки операторов (для назначения на операции)
CREATE TABLE public.operator_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  work_center_id UUID REFERENCES public.work_centers(id), -- на каком участке может работать
  standard_operation_id UUID REFERENCES public.standard_operations(id), -- какие операции может выполнять
  skill_level INTEGER NOT NULL DEFAULT 1, -- 1-5: уровень квалификации
  is_primary BOOLEAN NOT NULL DEFAULT false, -- основной навык
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Бригады
CREATE TABLE public.brigades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  brigade_type TEXT NOT NULL DEFAULT 'assembly', -- 'assembly' (сборка), 'machining' (механообработка), 'mixed' (смешанная)
  default_work_center_id UUID REFERENCES public.work_centers(id),
  work_schedule_id UUID REFERENCES public.work_schedules(id),
  productivity_factor NUMERIC NOT NULL DEFAULT 1.0, -- коэффициент производительности (зависит от состава)
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Состав бригад
CREATE TABLE public.brigade_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brigade_id UUID NOT NULL REFERENCES public.brigades(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'leader' (бригадир), 'member' (участник)
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
  left_at DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(brigade_id, operator_id)
);

-- 8. Назначения операторов на операции (для детального планирования)
CREATE TABLE public.operator_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  production_order_operation_id UUID NOT NULL REFERENCES public.production_order_operations(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES public.operators(id),
  assignment_date DATE NOT NULL,
  shift_number INTEGER NOT NULL DEFAULT 1,
  planned_start_time TIMESTAMP WITH TIME ZONE,
  planned_end_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'planned', -- 'planned', 'in_progress', 'completed', 'cancelled'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Назначения бригад на операции
CREATE TABLE public.brigade_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  production_order_operation_id UUID NOT NULL REFERENCES public.production_order_operations(id) ON DELETE CASCADE,
  brigade_id UUID NOT NULL REFERENCES public.brigades(id),
  assignment_date DATE NOT NULL,
  shift_number INTEGER NOT NULL DEFAULT 1,
  planned_start_time TIMESTAMP WITH TIME ZONE,
  planned_end_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Производственный календарь (исключения)
CREATE TABLE public.production_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_date DATE NOT NULL UNIQUE,
  day_type TEXT NOT NULL DEFAULT 'workday', -- 'workday', 'holiday', 'shortened', 'moved_workday'
  work_schedule_id UUID REFERENCES public.work_schedules(id), -- переопределение графика на этот день
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Привязка графика к рабочему центру
ALTER TABLE public.work_centers 
  ADD COLUMN IF NOT EXISTS work_schedule_id UUID REFERENCES public.work_schedules(id),
  ADD COLUMN IF NOT EXISTS resource_type TEXT DEFAULT 'individual', -- 'individual' (1 оператор), 'brigade' (бригада)
  ADD COLUMN IF NOT EXISTS operators_per_shift INTEGER DEFAULT 1;

-- Индексы
CREATE INDEX idx_work_schedule_shifts_schedule ON public.work_schedule_shifts(work_schedule_id);
CREATE INDEX idx_operators_work_center ON public.operators(default_work_center_id);
CREATE INDEX idx_operator_skills_operator ON public.operator_skills(operator_id);
CREATE INDEX idx_brigade_members_brigade ON public.brigade_members(brigade_id);
CREATE INDEX idx_operator_assignments_operation ON public.operator_assignments(production_order_operation_id);
CREATE INDEX idx_operator_assignments_date ON public.operator_assignments(assignment_date);
CREATE INDEX idx_brigade_assignments_operation ON public.brigade_assignments(production_order_operation_id);
CREATE INDEX idx_production_calendar_date ON public.production_calendar(calendar_date);

-- Enable RLS
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_schedule_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_schedule_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brigades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brigade_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brigade_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_calendar ENABLE ROW LEVEL SECURITY;

-- RLS Policies для work_schedules
CREATE POLICY "Authenticated users can read work_schedules" ON public.work_schedules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authorized users can insert work_schedules" ON public.work_schedules FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager')));
CREATE POLICY "Authorized users can update work_schedules" ON public.work_schedules FOR UPDATE USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager')));
CREATE POLICY "Authorized users can delete work_schedules" ON public.work_schedules FOR DELETE USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- RLS Policies для work_schedule_shifts
CREATE POLICY "Authenticated users can read work_schedule_shifts" ON public.work_schedule_shifts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authorized users can insert work_schedule_shifts" ON public.work_schedule_shifts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager')));
CREATE POLICY "Authorized users can update work_schedule_shifts" ON public.work_schedule_shifts FOR UPDATE USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager')));
CREATE POLICY "Authorized users can delete work_schedule_shifts" ON public.work_schedule_shifts FOR DELETE USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- RLS Policies для work_schedule_breaks
CREATE POLICY "Authenticated users can read work_schedule_breaks" ON public.work_schedule_breaks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authorized users can insert work_schedule_breaks" ON public.work_schedule_breaks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager')));
CREATE POLICY "Authorized users can update work_schedule_breaks" ON public.work_schedule_breaks FOR UPDATE USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager')));
CREATE POLICY "Authorized users can delete work_schedule_breaks" ON public.work_schedule_breaks FOR DELETE USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- RLS Policies для operators
CREATE POLICY "Authenticated users can read operators" ON public.operators FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authorized users can insert operators" ON public.operators FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager')));
CREATE POLICY "Authorized users can update operators" ON public.operators FOR UPDATE USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager')));
CREATE POLICY "Authorized users can delete operators" ON public.operators FOR DELETE USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- RLS Policies для operator_skills
CREATE POLICY "Authenticated users can read operator_skills" ON public.operator_skills FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authorized users can insert operator_skills" ON public.operator_skills FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager')));
CREATE POLICY "Authorized users can update operator_skills" ON public.operator_skills FOR UPDATE USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager')));
CREATE POLICY "Authorized users can delete operator_skills" ON public.operator_skills FOR DELETE USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- RLS Policies для brigades
CREATE POLICY "Authenticated users can read brigades" ON public.brigades FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authorized users can insert brigades" ON public.brigades FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager')));
CREATE POLICY "Authorized users can update brigades" ON public.brigades FOR UPDATE USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager')));
CREATE POLICY "Authorized users can delete brigades" ON public.brigades FOR DELETE USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- RLS Policies для brigade_members
CREATE POLICY "Authenticated users can read brigade_members" ON public.brigade_members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authorized users can insert brigade_members" ON public.brigade_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager')));
CREATE POLICY "Authorized users can update brigade_members" ON public.brigade_members FOR UPDATE USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager')));
CREATE POLICY "Authorized users can delete brigade_members" ON public.brigade_members FOR DELETE USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- RLS Policies для operator_assignments
CREATE POLICY "Authenticated users can read operator_assignments" ON public.operator_assignments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authorized users can insert operator_assignments" ON public.operator_assignments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager') OR has_role(auth.uid(), 'operator')));
CREATE POLICY "Authorized users can update operator_assignments" ON public.operator_assignments FOR UPDATE USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager') OR has_role(auth.uid(), 'operator')));
CREATE POLICY "Authorized users can delete operator_assignments" ON public.operator_assignments FOR DELETE USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager')));

-- RLS Policies для brigade_assignments
CREATE POLICY "Authenticated users can read brigade_assignments" ON public.brigade_assignments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authorized users can insert brigade_assignments" ON public.brigade_assignments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager') OR has_role(auth.uid(), 'operator')));
CREATE POLICY "Authorized users can update brigade_assignments" ON public.brigade_assignments FOR UPDATE USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager') OR has_role(auth.uid(), 'operator')));
CREATE POLICY "Authorized users can delete brigade_assignments" ON public.brigade_assignments FOR DELETE USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager')));

-- RLS Policies для production_calendar
CREATE POLICY "Authenticated users can read production_calendar" ON public.production_calendar FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authorized users can insert production_calendar" ON public.production_calendar FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager')));
CREATE POLICY "Authorized users can update production_calendar" ON public.production_calendar FOR UPDATE USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager')));
CREATE POLICY "Authorized users can delete production_calendar" ON public.production_calendar FOR DELETE USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- Auto-generate codes
CREATE OR REPLACE FUNCTION public.generate_work_schedule_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT := 'WS-';
  last_number INTEGER;
  next_code TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM '[0-9]+$') AS INTEGER)), 0)
  INTO last_number
  FROM work_schedules
  WHERE code ~ (prefix || '[0-9]+$');
  next_code := prefix || LPAD((last_number + 1)::TEXT, 3, '0');
  RETURN next_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_operator_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT := 'OP-';
  last_number INTEGER;
  next_code TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM '[0-9]+$') AS INTEGER)), 0)
  INTO last_number
  FROM operators
  WHERE code ~ (prefix || '[0-9]+$');
  next_code := prefix || LPAD((last_number + 1)::TEXT, 3, '0');
  RETURN next_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_brigade_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT := 'BR-';
  last_number INTEGER;
  next_code TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM '[0-9]+$') AS INTEGER)), 0)
  INTO last_number
  FROM brigades
  WHERE code ~ (prefix || '[0-9]+$');
  next_code := prefix || LPAD((last_number + 1)::TEXT, 3, '0');
  RETURN next_code;
END;
$$;

-- Auto-generate triggers
CREATE OR REPLACE FUNCTION public.auto_generate_work_schedule_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' OR NEW.code LIKE 'AUTO%' THEN
    NEW.code := generate_work_schedule_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_generate_work_schedule_code
  BEFORE INSERT ON public.work_schedules
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_work_schedule_code();

CREATE OR REPLACE FUNCTION public.auto_generate_operator_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' OR NEW.code LIKE 'AUTO%' THEN
    NEW.code := generate_operator_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_generate_operator_code
  BEFORE INSERT ON public.operators
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_operator_code();

CREATE OR REPLACE FUNCTION public.auto_generate_brigade_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' OR NEW.code LIKE 'AUTO%' THEN
    NEW.code := generate_brigade_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_generate_brigade_code
  BEFORE INSERT ON public.brigades
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_brigade_code();

-- Триггеры updated_at
CREATE TRIGGER update_work_schedules_updated_at
  BEFORE UPDATE ON public.work_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operators_updated_at
  BEFORE UPDATE ON public.operators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brigades_updated_at
  BEFORE UPDATE ON public.brigades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operator_assignments_updated_at
  BEFORE UPDATE ON public.operator_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brigade_assignments_updated_at
  BEFORE UPDATE ON public.brigade_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Вставка графика 2/2 по умолчанию
INSERT INTO public.work_schedules (code, name, description, schedule_type, cycle_days_on, cycle_days_off)
VALUES ('WS-001', 'График 2/2 (12 часов)', 'Сменный график 2 через 2, смена 12 часов', 'shift', 2, 2);

-- Вставка смены для графика 2/2
INSERT INTO public.work_schedule_shifts (work_schedule_id, shift_name, shift_number, start_time, end_time, gross_work_minutes, break_minutes)
SELECT id, 'Дневная смена', 1, '08:00', '20:00', 720, 50
FROM public.work_schedules WHERE code = 'WS-001';

-- Вставка перерывов
INSERT INTO public.work_schedule_breaks (shift_id, break_name, start_time, duration_minutes, is_paid)
SELECT s.id, 'Обед', '12:00', 30, false
FROM public.work_schedule_shifts s
JOIN public.work_schedules ws ON s.work_schedule_id = ws.id
WHERE ws.code = 'WS-001';

INSERT INTO public.work_schedule_breaks (shift_id, break_name, start_time, duration_minutes, is_paid)
SELECT s.id, 'Регламентируемый перерыв 1', '10:00', 10, true
FROM public.work_schedule_shifts s
JOIN public.work_schedules ws ON s.work_schedule_id = ws.id
WHERE ws.code = 'WS-001';

INSERT INTO public.work_schedule_breaks (shift_id, break_name, start_time, duration_minutes, is_paid)
SELECT s.id, 'Регламентируемый перерыв 2', '15:00', 10, true
FROM public.work_schedule_shifts s
JOIN public.work_schedules ws ON s.work_schedule_id = ws.id
WHERE ws.code = 'WS-001';