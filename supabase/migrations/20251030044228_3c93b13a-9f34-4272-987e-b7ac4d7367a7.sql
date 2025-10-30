-- Таблица операций производственных заказов
CREATE TABLE public.production_order_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  production_order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  routing_operation_id UUID NOT NULL REFERENCES public.routing_operations(id),
  sequence INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  planned_start_date TIMESTAMP WITH TIME ZONE,
  planned_end_date TIMESTAMP WITH TIME ZONE,
  actual_start_date TIMESTAMP WITH TIME ZONE,
  actual_end_date TIMESTAMP WITH TIME ZONE,
  completed_quantity NUMERIC NOT NULL DEFAULT 0,
  setup_time_actual NUMERIC,
  cycle_time_actual NUMERIC,
  operator_id UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица истории изменений производственных заказов
CREATE TABLE public.production_order_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  production_order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  change_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.production_order_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_order_history ENABLE ROW LEVEL SECURITY;

-- RLS policies для production_order_operations
CREATE POLICY "Allow public read access on production_order_operations"
  ON public.production_order_operations
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access on production_order_operations"
  ON public.production_order_operations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access on production_order_operations"
  ON public.production_order_operations
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete access on production_order_operations"
  ON public.production_order_operations
  FOR DELETE
  USING (true);

-- RLS policies для production_order_history
CREATE POLICY "Allow public read access on production_order_history"
  ON public.production_order_history
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access on production_order_history"
  ON public.production_order_history
  FOR INSERT
  WITH CHECK (true);

-- Triggers для updated_at
CREATE TRIGGER update_production_order_operations_updated_at
  BEFORE UPDATE ON public.production_order_operations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Индексы для оптимизации
CREATE INDEX idx_production_order_operations_order ON public.production_order_operations(production_order_id);
CREATE INDEX idx_production_order_history_order ON public.production_order_history(production_order_id);
CREATE INDEX idx_production_order_operations_status ON public.production_order_operations(status);