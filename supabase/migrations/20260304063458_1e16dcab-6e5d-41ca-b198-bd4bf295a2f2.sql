
-- Справочник типов дефектов
CREATE TABLE public.defect_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  severity TEXT NOT NULL DEFAULT 'minor',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Акты контроля качества
CREATE TABLE public.quality_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_number TEXT NOT NULL UNIQUE,
  production_order_id UUID REFERENCES public.production_orders(id) ON DELETE CASCADE NOT NULL,
  production_order_operation_id UUID REFERENCES public.production_order_operations(id) ON DELETE SET NULL,
  inspector_id UUID REFERENCES public.profiles(id),
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  result TEXT NOT NULL DEFAULT 'pending',
  inspected_quantity NUMERIC NOT NULL DEFAULT 0,
  passed_quantity NUMERIC NOT NULL DEFAULT 0,
  rejected_quantity NUMERIC NOT NULL DEFAULT 0,
  rework_quantity NUMERIC NOT NULL DEFAULT 0,
  defect_type_id UUID REFERENCES public.defect_types(id),
  defect_description TEXT,
  corrective_action TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS для defect_types
ALTER TABLE public.defect_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read defect_types"
  ON public.defect_types FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert defect_types"
  ON public.defect_types FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager')));

CREATE POLICY "Authorized users can update defect_types"
  ON public.defect_types FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager')));

CREATE POLICY "Only admins can delete defect_types"
  ON public.defect_types FOR DELETE
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- RLS для quality_inspections
ALTER TABLE public.quality_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read quality_inspections"
  ON public.quality_inspections FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert quality_inspections"
  ON public.quality_inspections FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager') OR has_role(auth.uid(), 'operator')));

CREATE POLICY "Authorized users can update quality_inspections"
  ON public.quality_inspections FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'production_manager') OR has_role(auth.uid(), 'operator')));

CREATE POLICY "Only admins can delete quality_inspections"
  ON public.quality_inspections FOR DELETE
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));
