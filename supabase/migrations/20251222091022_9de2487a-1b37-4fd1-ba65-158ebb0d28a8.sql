-- Таблица для хранения связей прогул-отработка
CREATE TABLE public.absence_compensations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  absence_date DATE NOT NULL,
  absence_hours NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed', 'cancelled'))
);

-- Таблица для записей отработки
CREATE TABLE public.compensation_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  absence_compensation_id UUID NOT NULL REFERENCES public.absence_compensations(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  compensation_date DATE NOT NULL,
  hours_worked NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Включаем RLS
ALTER TABLE public.absence_compensations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compensation_records ENABLE ROW LEVEL SECURITY;

-- Политики для absence_compensations
CREATE POLICY "Authenticated users can read absence_compensations"
  ON public.absence_compensations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert absence_compensations"
  ON public.absence_compensations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'production_manager'::app_role)
  ));

CREATE POLICY "Authorized users can update absence_compensations"
  ON public.absence_compensations FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'production_manager'::app_role)
  ));

CREATE POLICY "Authorized users can delete absence_compensations"
  ON public.absence_compensations FOR DELETE
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Политики для compensation_records
CREATE POLICY "Authenticated users can read compensation_records"
  ON public.compensation_records FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert compensation_records"
  ON public.compensation_records FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'production_manager'::app_role)
  ));

CREATE POLICY "Authorized users can update compensation_records"
  ON public.compensation_records FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'production_manager'::app_role)
  ));

CREATE POLICY "Authorized users can delete compensation_records"
  ON public.compensation_records FOR DELETE
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Триггер для обновления updated_at
CREATE TRIGGER update_absence_compensations_updated_at
  BEFORE UPDATE ON public.absence_compensations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Индексы для производительности
CREATE INDEX idx_absence_compensations_operator ON public.absence_compensations(operator_id);
CREATE INDEX idx_absence_compensations_date ON public.absence_compensations(absence_date);
CREATE INDEX idx_absence_compensations_status ON public.absence_compensations(status);
CREATE INDEX idx_compensation_records_absence ON public.compensation_records(absence_compensation_id);
CREATE INDEX idx_compensation_records_operator ON public.compensation_records(operator_id);
CREATE INDEX idx_compensation_records_date ON public.compensation_records(compensation_date);