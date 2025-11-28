-- Create specification history table
CREATE TABLE public.specification_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specification_id UUID NOT NULL REFERENCES specifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  change_type TEXT NOT NULL, -- 'created', 'updated', 'activated', 'deactivated'
  description TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.specification_history ENABLE ROW LEVEL SECURITY;

-- Create policies for specification history
CREATE POLICY "Allow public read access on specification_history"
  ON public.specification_history
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access on specification_history"
  ON public.specification_history
  FOR INSERT
  WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX idx_specification_history_specification_id 
  ON public.specification_history(specification_id);

CREATE INDEX idx_specification_history_created_at 
  ON public.specification_history(created_at DESC);