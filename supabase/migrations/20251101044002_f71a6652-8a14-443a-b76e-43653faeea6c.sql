-- Создаем таблицу для истории расчетов MRP
CREATE TABLE public.mrp_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculation_date timestamp with time zone NOT NULL DEFAULT now(),
  planning_horizon_days integer NOT NULL,
  start_date date NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Создаем таблицу для результатов расчета MRP
CREATE TABLE public.mrp_calculation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculation_id uuid NOT NULL REFERENCES public.mrp_calculations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  gross_requirement numeric NOT NULL DEFAULT 0,
  on_hand numeric NOT NULL DEFAULT 0,
  reserved numeric NOT NULL DEFAULT 0,
  available numeric NOT NULL DEFAULT 0,
  net_requirement numeric NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('shortage', 'warning', 'ok')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Создаем таблицу для заявок на закупку
CREATE TABLE public.purchase_requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_number text NOT NULL UNIQUE,
  calculation_id uuid REFERENCES public.mrp_calculations(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity numeric NOT NULL,
  required_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'ordered', 'cancelled')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.mrp_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mrp_calculation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requisitions ENABLE ROW LEVEL SECURITY;

-- Политики для mrp_calculations
CREATE POLICY "Allow public read access on mrp_calculations"
ON public.mrp_calculations FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access on mrp_calculations"
ON public.mrp_calculations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public delete access on mrp_calculations"
ON public.mrp_calculations FOR DELETE
USING (true);

-- Политики для mrp_calculation_results
CREATE POLICY "Allow public read access on mrp_calculation_results"
ON public.mrp_calculation_results FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access on mrp_calculation_results"
ON public.mrp_calculation_results FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public delete access on mrp_calculation_results"
ON public.mrp_calculation_results FOR DELETE
USING (true);

-- Политики для purchase_requisitions
CREATE POLICY "Allow public read access on purchase_requisitions"
ON public.purchase_requisitions FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access on purchase_requisitions"
ON public.purchase_requisitions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update access on purchase_requisitions"
ON public.purchase_requisitions FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete access on purchase_requisitions"
ON public.purchase_requisitions FOR DELETE
USING (true);

-- Триггеры для обновления updated_at
CREATE TRIGGER update_purchase_requisitions_updated_at
BEFORE UPDATE ON public.purchase_requisitions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Создаем индексы для производительности
CREATE INDEX idx_mrp_calc_results_calc_id ON public.mrp_calculation_results(calculation_id);
CREATE INDEX idx_purchase_req_calc_id ON public.purchase_requisitions(calculation_id);
CREATE INDEX idx_purchase_req_status ON public.purchase_requisitions(status);