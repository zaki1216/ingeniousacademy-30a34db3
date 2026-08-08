-- 1. Boards
CREATE TABLE public.boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boards TO authenticated;
GRANT ALL ON public.boards TO service_role;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY boards_select ON public.boards FOR SELECT TO authenticated USING (true);
CREATE POLICY boards_admin_all ON public.boards FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER boards_set_updated_at BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_updated_at();

INSERT INTO public.boards (name, display_order) VALUES ('Maharashtra Board', 1);

-- 2. Standards belong to a board
ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS board_id uuid REFERENCES public.boards(id) ON DELETE SET NULL;
UPDATE public.standards SET board_id = (SELECT id FROM public.boards ORDER BY display_order LIMIT 1);

-- 3. Academic subjects (Mathematics, Science, English...) per standard
CREATE TABLE public.academic_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id uuid NOT NULL REFERENCES public.standards(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_name text,
  icon text,
  building_id text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (standard_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_subjects TO authenticated;
GRANT ALL ON public.academic_subjects TO service_role;
ALTER TABLE public.academic_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY academic_subjects_select ON public.academic_subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY academic_subjects_admin_all ON public.academic_subjects FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER academic_subjects_set_updated_at BEFORE UPDATE ON public.academic_subjects
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_updated_at();

-- 4. Course -> (standard, subject) mapping lives on the existing link table
ALTER TABLE public.subject_standards
  ADD COLUMN IF NOT EXISTS academic_subject_id uuid REFERENCES public.academic_subjects(id) ON DELETE SET NULL;

-- 5. Ordering / status columns
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';
ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS duration_seconds integer;

-- 6. Classify existing courses into subjects (no content duplicated)
INSERT INTO public.academic_subjects (standard_id, name, sort_order)
SELECT DISTINCT ss.standard_id,
  CASE
    WHEN s.subject_name ILIKE 'algebra%' OR s.subject_name ILIKE 'geometry%' OR s.subject_name ILIKE '%maths%' OR s.subject_name ILIKE 'mathematics%' THEN 'Mathematics'
    WHEN s.subject_name ILIKE 'science%' THEN 'Science'
    WHEN s.subject_name ILIKE 'english%' THEN 'English'
    WHEN s.subject_name ILIKE 'marathi%' THEN 'Marathi'
    WHEN s.subject_name ILIKE 'hindi%' THEN 'Hindi'
    WHEN s.subject_name ILIKE 'history%' THEN 'History'
    ELSE s.subject_name
  END,
  0
FROM public.subject_standards ss
JOIN public.subjects s ON s.id = ss.subject_id
ON CONFLICT (standard_id, name) DO NOTHING;

UPDATE public.subject_standards ss
SET academic_subject_id = a.id
FROM public.subjects s, public.academic_subjects a
WHERE s.id = ss.subject_id
  AND a.standard_id = ss.standard_id
  AND a.name = CASE
    WHEN s.subject_name ILIKE 'algebra%' OR s.subject_name ILIKE 'geometry%' OR s.subject_name ILIKE '%maths%' OR s.subject_name ILIKE 'mathematics%' THEN 'Mathematics'
    WHEN s.subject_name ILIKE 'science%' THEN 'Science'
    WHEN s.subject_name ILIKE 'english%' THEN 'English'
    WHEN s.subject_name ILIKE 'marathi%' THEN 'Marathi'
    WHEN s.subject_name ILIKE 'hindi%' THEN 'Hindi'
    WHEN s.subject_name ILIKE 'history%' THEN 'History'
    ELSE s.subject_name
  END;

-- Keep default subject ordering stable and alphabetical
WITH ordered AS (
  SELECT id, row_number() OVER (PARTITION BY standard_id ORDER BY name) AS rn
  FROM public.academic_subjects
)
UPDATE public.academic_subjects a SET sort_order = o.rn FROM ordered o WHERE o.id = a.id;

-- Course display order follows current alphabetical listing
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY subject_name) AS rn FROM public.subjects
)
UPDATE public.subjects s SET sort_order = o.rn FROM ordered o WHERE o.id = s.id;