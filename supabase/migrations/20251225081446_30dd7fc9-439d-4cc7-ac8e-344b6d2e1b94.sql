-- Create overtime_entries table for detailed overtime tracking
CREATE TABLE public.overtime_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  timesheet_id UUID REFERENCES public.operator_timesheets(id) ON DELETE SET NULL,
  work_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (end_time - start_time)) / 60
  ) STORED,
  description TEXT NOT NULL, -- Обязательное поле: что делал сотрудник
  work_order_id UUID REFERENCES public.production_orders(id) ON DELETE SET NULL, -- Опциональная привязка к заказу
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, cancelled
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comments
COMMENT ON TABLE public.overtime_entries IS 'Записи переработок сотрудников';
COMMENT ON COLUMN public.overtime_entries.description IS 'Обязательное описание: что делал сотрудник во время переработки';
COMMENT ON COLUMN public.overtime_entries.work_order_id IS 'Опциональная привязка к производственному заказу';

-- Enable RLS
ALTER TABLE public.overtime_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can read overtime_entries"
  ON public.overtime_entries
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert overtime_entries"
  ON public.overtime_entries
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'production_manager'::app_role)
    )
  );

CREATE POLICY "Authorized users can update overtime_entries"
  ON public.overtime_entries
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'production_manager'::app_role)
    )
  );

CREATE POLICY "Authorized users can delete overtime_entries"
  ON public.overtime_entries
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Create index for fast lookups
CREATE INDEX idx_overtime_entries_operator_date ON public.overtime_entries(operator_id, work_date);
CREATE INDEX idx_overtime_entries_status ON public.overtime_entries(status);

-- Create trigger for updated_at
CREATE TRIGGER update_overtime_entries_updated_at
  BEFORE UPDATE ON public.overtime_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create constraint to ensure end_time > start_time
ALTER TABLE public.overtime_entries
  ADD CONSTRAINT overtime_entries_time_check 
  CHECK (end_time > start_time);

-- Create constraint for valid status
ALTER TABLE public.overtime_entries
  ADD CONSTRAINT overtime_entries_status_check
  CHECK (status IN ('pending', 'approved', 'cancelled'));