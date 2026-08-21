CREATE TABLE public.lecture_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'pdf',
  file_url text NOT NULL,
  file_path text,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lecture_resources TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lecture_resources TO authenticated;
GRANT ALL ON public.lecture_resources TO service_role;

ALTER TABLE public.lecture_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read published materials"
  ON public.lecture_resources FOR SELECT TO authenticated
  USING (status = 'published' OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage materials"
  ON public.lecture_resources FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX lecture_resources_lecture_idx ON public.lecture_resources(lecture_id);

CREATE TRIGGER lecture_resources_set_updated_at
  BEFORE UPDATE ON public.lecture_resources
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_updated_at();