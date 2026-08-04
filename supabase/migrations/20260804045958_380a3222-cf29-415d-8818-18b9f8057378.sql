CREATE TABLE public.dorm_layouts (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slots JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dorm_layouts TO authenticated;
GRANT ALL ON public.dorm_layouts TO service_role;

ALTER TABLE public.dorm_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage their own dorm layout"
ON public.dorm_layouts FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER dorm_layouts_set_updated_at
BEFORE UPDATE ON public.dorm_layouts
FOR EACH ROW EXECUTE FUNCTION public.tg_update_updated_at();