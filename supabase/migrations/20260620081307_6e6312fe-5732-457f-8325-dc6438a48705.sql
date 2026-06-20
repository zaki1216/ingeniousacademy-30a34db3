
-- 1. Extend tests with lecture-quiz config
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS marks_per_question int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS passing_marks int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time_limit_seconds int;

-- 2. Extend chapters with completion rewards
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS completion_xp int NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS completion_coins int NOT NULL DEFAULT 50;

-- 3. chapter_completions
CREATE TABLE IF NOT EXISTS public.chapter_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  xp_awarded int NOT NULL DEFAULT 0,
  coins_awarded int NOT NULL DEFAULT 0,
  UNIQUE (user_id, chapter_id)
);

GRANT SELECT ON public.chapter_completions TO authenticated;
GRANT ALL ON public.chapter_completions TO service_role;
ALTER TABLE public.chapter_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own chapter completions"
  ON public.chapter_completions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::app_role));

-- 4. manual_unlocks (admin override)
CREATE TABLE IF NOT EXISTS public.manual_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lecture_id uuid NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  unlocked boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (user_id, lecture_id)
);

GRANT SELECT ON public.manual_unlocks TO authenticated;
GRANT ALL ON public.manual_unlocks TO service_role;
ALTER TABLE public.manual_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own manual unlocks"
  ON public.manual_unlocks FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin manages manual unlocks"
  ON public.manual_unlocks FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- 5. Unlock-state helper (returns one row per lecture for the student's standard)
CREATE OR REPLACE FUNCTION public.get_lecture_unlock_state(_user_id uuid)
RETURNS TABLE (
  lecture_id uuid,
  chapter_id uuid,
  subject_id uuid,
  lecture_number int,
  unlocked boolean,
  quiz_passed boolean,
  best_score int,
  passing_marks int,
  total_marks int,
  test_id uuid,
  prev_lecture_id uuid,
  prev_passing_marks int,
  prev_total_marks int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH stu AS (
    SELECT standard_id FROM public.profiles WHERE id = _user_id
  ),
  lec AS (
    SELECT l.id AS lecture_id, l.chapter_id, c.subject_id, l.lecture_number
    FROM public.lectures l
    JOIN public.chapters c ON c.id = l.chapter_id
    JOIN public.subjects s ON s.id = c.subject_id
    WHERE s.standard_id = (SELECT standard_id FROM stu)
  ),
  lec_quiz AS (
    SELECT lec.*,
           t.id AS test_id,
           COALESCE(t.passing_marks,0) AS passing_marks,
           COALESCE(t.total_marks,0) AS total_marks,
           COALESCE(t.marks_per_question,1) AS marks_per_question
    FROM lec
    LEFT JOIN public.tests t
      ON t.lecture_id = lec.lecture_id AND t.kind = 'lecture_quiz'
  ),
  best AS (
    SELECT qa.lecture_id,
           MAX(qa.correct_count * COALESCE(t.marks_per_question,1)) AS best_score
    FROM public.quiz_attempts qa
    LEFT JOIN public.tests t ON t.id = qa.test_id
    WHERE qa.student_id = _user_id
    GROUP BY qa.lecture_id
  ),
  joined AS (
    SELECT lq.*,
           COALESCE(b.best_score, 0) AS best_score,
           (COALESCE(b.best_score, 0) >= lq.passing_marks AND lq.test_id IS NOT NULL AND lq.passing_marks > 0) AS quiz_passed,
           LAG(lq.lecture_id) OVER (PARTITION BY lq.chapter_id ORDER BY lq.lecture_number) AS prev_lecture_id,
           LAG(lq.passing_marks) OVER (PARTITION BY lq.chapter_id ORDER BY lq.lecture_number) AS prev_passing_marks,
           LAG(lq.total_marks) OVER (PARTITION BY lq.chapter_id ORDER BY lq.lecture_number) AS prev_total_marks,
           LAG(lq.test_id) OVER (PARTITION BY lq.chapter_id ORDER BY lq.lecture_number) AS prev_test_id
    FROM lec_quiz lq
    LEFT JOIN best b ON b.lecture_id = lq.lecture_id
  )
  SELECT
    j.lecture_id,
    j.chapter_id,
    j.subject_id,
    j.lecture_number,
    CASE
      WHEN EXISTS (SELECT 1 FROM public.manual_unlocks mu WHERE mu.user_id = _user_id AND mu.lecture_id = j.lecture_id AND mu.unlocked = true) THEN true
      WHEN EXISTS (SELECT 1 FROM public.manual_unlocks mu WHERE mu.user_id = _user_id AND mu.lecture_id = j.lecture_id AND mu.unlocked = false) THEN false
      WHEN j.prev_lecture_id IS NULL THEN true
      WHEN j.prev_test_id IS NULL THEN true -- no quiz on previous lecture => auto unlock
      ELSE EXISTS (
        SELECT 1 FROM public.quiz_attempts qa
        LEFT JOIN public.tests t ON t.id = qa.test_id
        WHERE qa.student_id = _user_id
          AND qa.lecture_id = j.prev_lecture_id
          AND qa.correct_count * COALESCE(t.marks_per_question,1) >= COALESCE(j.prev_passing_marks,0)
      )
    END AS unlocked,
    j.quiz_passed,
    j.best_score,
    j.passing_marks,
    j.total_marks,
    j.test_id,
    j.prev_lecture_id,
    j.prev_passing_marks,
    j.prev_total_marks
  FROM joined j;
$$;

GRANT EXECUTE ON FUNCTION public.get_lecture_unlock_state(uuid) TO authenticated, service_role;
