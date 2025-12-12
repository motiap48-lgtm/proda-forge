-- Create distribution history table
CREATE TABLE public.distribution_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  routing_sheet_id UUID NOT NULL REFERENCES public.routing_sheets(id) ON DELETE CASCADE,
  strategy TEXT NOT NULL,
  components_distributed INTEGER NOT NULL DEFAULT 0,
  operations_affected INTEGER NOT NULL DEFAULT 0,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.distribution_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view distribution history"
  ON public.distribution_history
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users with production_manager or admin role can insert distribution history"
  ON public.distribution_history
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'production_manager')
  );

CREATE POLICY "Users with admin role can delete distribution history"
  ON public.distribution_history
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX idx_distribution_history_routing_sheet_id ON public.distribution_history(routing_sheet_id);
CREATE INDEX idx_distribution_history_created_at ON public.distribution_history(created_at DESC);