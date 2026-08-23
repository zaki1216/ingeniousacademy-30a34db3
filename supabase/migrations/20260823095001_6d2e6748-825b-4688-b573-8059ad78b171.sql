ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS academic_subject_id uuid REFERENCES public.academic_subjects(id) ON DELETE CASCADE;

ALTER TABLE public.chapters ALTER COLUMN subject_id DROP NOT NULL;

ALTER TABLE public.chapters
  ADD CONSTRAINT chapters_single_parent CHECK (
    (subject_id IS NOT NULL AND academic_subject_id IS NULL)
    OR (subject_id IS NULL AND academic_subject_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS chapters_academic_subject_id_idx ON public.chapters(academic_subject_id);