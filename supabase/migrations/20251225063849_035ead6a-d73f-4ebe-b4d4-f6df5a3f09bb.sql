-- Create table for changelog view analytics
CREATE TABLE public.changelog_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  changelog_id UUID NOT NULL REFERENCES public.changelog_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  view_source TEXT DEFAULT 'dialog'
);

-- Enable RLS
ALTER TABLE public.changelog_views ENABLE ROW LEVEL SECURITY;

-- Create index for analytics queries
CREATE INDEX idx_changelog_views_changelog_id ON public.changelog_views(changelog_id);
CREATE INDEX idx_changelog_views_user_id ON public.changelog_views(user_id);
CREATE INDEX idx_changelog_views_viewed_at ON public.changelog_views(viewed_at);

-- Policies
CREATE POLICY "Authenticated users can read changelog_views" 
ON public.changelog_views 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert own changelog_views" 
ON public.changelog_views 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can delete changelog_views" 
ON public.changelog_views 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));