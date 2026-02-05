-- Таблица истории занятости сотрудников
CREATE TABLE public.employment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('hired', 'terminated', 'reinstated')),
  event_date DATE NOT NULL,
  reason TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Добавляем поле причины увольнения в operators
ALTER TABLE public.operators 
ADD COLUMN IF NOT EXISTS termination_reason TEXT;

-- Включаем RLS
ALTER TABLE public.employment_history ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Authenticated users can read employment_history"
ON public.employment_history FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert employment_history"
ON public.employment_history FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'production_manager'::app_role)
  )
);

CREATE POLICY "Authorized users can update employment_history"
ON public.employment_history FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'production_manager'::app_role)
  )
);

CREATE POLICY "Only admins can delete employment_history"
ON public.employment_history FOR DELETE
USING (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role)
);

-- Индекс для быстрого поиска по оператору
CREATE INDEX idx_employment_history_operator_id ON public.employment_history(operator_id);
CREATE INDEX idx_employment_history_event_date ON public.employment_history(event_date DESC);