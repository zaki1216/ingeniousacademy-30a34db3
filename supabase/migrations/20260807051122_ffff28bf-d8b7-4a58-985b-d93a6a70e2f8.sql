-- 1. Shared curriculum columns on subjects (courses)
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS previous_version_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE public.subjects ALTER COLUMN standard_id DROP NOT NULL;

DROP TRIGGER IF EXISTS subjects_set_updated_at ON public.subjects;
CREATE TRIGGER subjects_set_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_updated_at();

-- 2. Course <-> standard link table
CREATE TABLE IF NOT EXISTS public.subject_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  standard_id uuid NOT NULL REFERENCES public.standards(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, standard_id)
);

CREATE INDEX IF NOT EXISTS subject_standards_standard_idx ON public.subject_standards(standard_id);
CREATE INDEX IF NOT EXISTS subject_standards_subject_idx ON public.subject_standards(subject_id);

GRANT SELECT ON public.subject_standards TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subject_standards TO authenticated;
GRANT ALL ON public.subject_standards TO service_role;

ALTER TABLE public.subject_standards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subject_standards_select_authenticated"
  ON public.subject_standards FOR SELECT TO authenticated USING (true);

CREATE POLICY "subject_standards_admin_write"
  ON public.subject_standards FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- 3. Backfill links from the existing single-standard relationship
INSERT INTO public.subject_standards (subject_id, standard_id)
SELECT s.id, s.standard_id FROM public.subjects s
WHERE s.standard_id IS NOT NULL
ON CONFLICT (subject_id, standard_id) DO NOTHING;

-- 4. Keep the link in sync when a subject is created/moved the legacy way
CREATE OR REPLACE FUNCTION public.tg_subject_sync_standard_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.standard_id IS NOT NULL THEN
    INSERT INTO public.subject_standards (subject_id, standard_id)
    VALUES (NEW.id, NEW.standard_id)
    ON CONFLICT (subject_id, standard_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subjects_sync_standard_link ON public.subjects;
CREATE TRIGGER subjects_sync_standard_link
  AFTER INSERT OR UPDATE OF standard_id ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.tg_subject_sync_standard_link();