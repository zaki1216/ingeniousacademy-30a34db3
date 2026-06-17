
-- 1) Extend tests for lecture quizzes
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS lecture_id uuid REFERENCES public.lectures(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'lecture_quiz';

CREATE INDEX IF NOT EXISTS tests_lecture_id_idx ON public.tests(lecture_id);

-- Backfill kind for existing boss tests
UPDATE public.tests SET kind = 'boss' WHERE is_boss = true AND kind <> 'boss';

-- 2) quiz_attempts table (game; replayable, never affects academics)
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  lecture_id uuid REFERENCES public.lectures(id) ON DELETE SET NULL,
  correct_count integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  coins_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quiz_attempts_student_idx ON public.quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS quiz_attempts_test_idx ON public.quiz_attempts(test_id);

GRANT SELECT, INSERT ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_attempts_self_select" ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "quiz_attempts_self_insert" ON public.quiz_attempts
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "quiz_attempts_admin_all" ON public.quiz_attempts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) offline_tests (academic; teacher-entered marks)
CREATE TABLE IF NOT EXISTS public.offline_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  max_marks integer NOT NULL CHECK (max_marks > 0),
  test_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS offline_tests_subject_idx ON public.offline_tests(subject_id);
CREATE INDEX IF NOT EXISTS offline_tests_chapter_idx ON public.offline_tests(chapter_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offline_tests TO authenticated;
GRANT ALL ON public.offline_tests TO service_role;
ALTER TABLE public.offline_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offline_tests_select" ON public.offline_tests
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "offline_tests_admin_write" ON public.offline_tests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER offline_tests_set_updated_at
  BEFORE UPDATE ON public.offline_tests
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_updated_at();

-- 4) offline_marks (one row per student per offline test)
CREATE TABLE IF NOT EXISTS public.offline_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offline_test_id uuid NOT NULL REFERENCES public.offline_tests(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marks_obtained numeric(6,2) NOT NULL CHECK (marks_obtained >= 0),
  remarks text,
  entered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offline_test_id, student_id)
);
CREATE INDEX IF NOT EXISTS offline_marks_student_idx ON public.offline_marks(student_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offline_marks TO authenticated;
GRANT ALL ON public.offline_marks TO service_role;
ALTER TABLE public.offline_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offline_marks_self_select" ON public.offline_marks
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "offline_marks_admin_write" ON public.offline_marks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER offline_marks_set_updated_at
  BEFORE UPDATE ON public.offline_marks
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_updated_at();

-- 5) report_card_remarks (teacher remarks per student, per term)
CREATE TABLE IF NOT EXISTS public.report_card_remarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term text NOT NULL DEFAULT 'overall',
  remarks text NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, term)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_card_remarks TO authenticated;
GRANT ALL ON public.report_card_remarks TO service_role;
ALTER TABLE public.report_card_remarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_remarks_self_select" ON public.report_card_remarks
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "report_remarks_admin_write" ON public.report_card_remarks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER report_remarks_set_updated_at
  BEFORE UPDATE ON public.report_card_remarks
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_updated_at();
