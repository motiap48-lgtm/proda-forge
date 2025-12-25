-- Create changelog table
CREATE TABLE public.changelog_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  changes TEXT[] NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create feature statuses table
CREATE TABLE public.feature_statuses (
  id TEXT NOT NULL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'done' CHECK (status IN ('done', 'in-progress', 'planned')),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create table to track seen changelog entries by users
CREATE TABLE public.user_seen_changelog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changelog_id UUID NOT NULL REFERENCES public.changelog_entries(id) ON DELETE CASCADE,
  seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, changelog_id)
);

-- Enable RLS
ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_seen_changelog ENABLE ROW LEVEL SECURITY;

-- Changelog entries policies
CREATE POLICY "Anyone can read published changelog entries"
ON public.changelog_entries FOR SELECT
USING (is_published = true OR (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can insert changelog entries"
ON public.changelog_entries FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update changelog entries"
ON public.changelog_entries FOR UPDATE
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete changelog entries"
ON public.changelog_entries FOR DELETE
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Feature statuses policies
CREATE POLICY "Anyone can read feature statuses"
ON public.feature_statuses FOR SELECT
USING (true);

CREATE POLICY "Admins can manage feature statuses"
ON public.feature_statuses FOR ALL
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- User seen changelog policies
CREATE POLICY "Users can read own seen changelog"
ON public.user_seen_changelog FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own seen changelog"
ON public.user_seen_changelog FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_changelog_entries_updated_at
BEFORE UPDATE ON public.changelog_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feature_statuses_updated_at
BEFORE UPDATE ON public.feature_statuses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();