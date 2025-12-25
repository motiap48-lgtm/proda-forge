
-- Create table for overtime medals settings
CREATE TABLE public.overtime_medals_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default settings
INSERT INTO public.overtime_medals_settings (is_enabled) VALUES (false);

-- Enable RLS
ALTER TABLE public.overtime_medals_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read overtime_medals_settings"
ON public.overtime_medals_settings FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update overtime_medals_settings"
ON public.overtime_medals_settings FOR UPDATE
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- Create table for monthly medal history
CREATE TABLE public.overtime_monthly_medals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL,
  medal_type text NOT NULL CHECK (medal_type IN ('gold', 'silver', 'bronze')),
  total_overtime_minutes integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (year, month, medal_type)
);

-- Enable RLS
ALTER TABLE public.overtime_monthly_medals ENABLE ROW LEVEL SECURITY;

-- RLS policies for monthly medals
CREATE POLICY "Authenticated users can read overtime_monthly_medals"
ON public.overtime_monthly_medals FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage overtime_monthly_medals"
ON public.overtime_monthly_medals FOR ALL
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));
