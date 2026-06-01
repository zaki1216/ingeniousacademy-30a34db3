
-- =========== ENUMS ===========
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- =========== STANDARDS ===========
CREATE TABLE public.standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.standards TO authenticated;
GRANT ALL ON public.standards TO service_role;
ALTER TABLE public.standards ENABLE ROW LEVEL SECURITY;

-- =========== PROFILES ===========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  parent_phone TEXT,
  standard_id UUID REFERENCES public.standards(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========== USER ROLES ===========
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =========== SUBJECTS ===========
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_name TEXT NOT NULL,
  standard_id UUID NOT NULL REFERENCES public.standards(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- =========== CHAPTERS ===========
CREATE TABLE public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_name TEXT NOT NULL,
  chapter_number INT NOT NULL DEFAULT 1,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapters TO authenticated;
GRANT ALL ON public.chapters TO service_role;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- =========== LECTURES ===========
CREATE TABLE public.lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_title TEXT NOT NULL,
  lecture_number INT NOT NULL DEFAULT 1,
  youtube_url TEXT NOT NULL,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lectures TO authenticated;
GRANT ALL ON public.lectures TO service_role;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;

-- =========== NOTES ===========
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- =========== ANNOUNCEMENTS ===========
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- =========== TESTS ===========
CREATE TABLE public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  total_marks INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tests TO authenticated;
GRANT ALL ON public.tests TO service_role;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

-- =========== QUESTIONS ===========
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option INT NOT NULL,
  marks INT NOT NULL DEFAULT 1,
  question_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- =========== RESULTS ===========
CREATE TABLE public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  score INT NOT NULL,
  total_marks INT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  answers JSONB NOT NULL,
  attempt_date TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.results TO authenticated;
GRANT ALL ON public.results TO service_role;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- =========== RLS POLICIES ===========

-- standards: all authenticated can read; admin writes
CREATE POLICY "standards_select" ON public.standards FOR SELECT TO authenticated USING (true);
CREATE POLICY "standards_admin_all" ON public.standards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- profiles: users see/edit their own; admin sees/edits all
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_admin_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_admin_delete" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- user_roles: users can see own; admin all
CREATE POLICY "user_roles_self_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- subjects / chapters / lectures / notes / announcements / tests: all authenticated read; admin write
CREATE POLICY "subjects_select" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "subjects_admin_all" ON public.subjects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "chapters_select" ON public.chapters FOR SELECT TO authenticated USING (true);
CREATE POLICY "chapters_admin_all" ON public.chapters FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "lectures_select" ON public.lectures FOR SELECT TO authenticated USING (true);
CREATE POLICY "lectures_admin_all" ON public.lectures FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "notes_select" ON public.notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "notes_admin_all" ON public.notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "announcements_select" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "announcements_admin_all" ON public.announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "tests_select" ON public.tests FOR SELECT TO authenticated USING (true);
CREATE POLICY "tests_admin_all" ON public.tests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- questions: students can read but server fn strips correct_option; admin full
CREATE POLICY "questions_select" ON public.questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "questions_admin_all" ON public.questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- results: students see/insert own; admin sees all
CREATE POLICY "results_self_select" ON public.results FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "results_self_insert" ON public.results FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "results_admin_all" ON public.results FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========== SEED DATA ===========
INSERT INTO public.standards (name, display_order) VALUES
  ('4th Standard', 4),
  ('5th Standard', 5),
  ('6th Standard', 6),
  ('7th Standard', 7),
  ('8th Standard', 8),
  ('9th Standard', 9),
  ('10th Standard', 10);

INSERT INTO public.subjects (subject_name, standard_id, description)
SELECT 'Mathematics', id, 'Mathematics for 10th standard students' FROM public.standards WHERE name = '10th Standard';

INSERT INTO public.chapters (chapter_name, chapter_number, subject_id, description)
SELECT 'Real Numbers', 1, s.id, 'Introduction to real numbers, Euclid''s division lemma, and irrational numbers.'
FROM public.subjects s
JOIN public.standards st ON st.id = s.standard_id
WHERE s.subject_name = 'Mathematics' AND st.name = '10th Standard';

INSERT INTO public.lectures (lecture_title, lecture_number, youtube_url, chapter_id, description)
SELECT 'Introduction to Real Numbers', 1, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', c.id, 'Overview of real numbers and their properties.'
FROM public.chapters c WHERE c.chapter_name = 'Real Numbers';

INSERT INTO public.announcements (title, message) VALUES
  ('Welcome to Ingenious Academy', 'Learn Smart. Understand Better. Score Higher. Browse your lectures, notes, and tests from the dashboard.');

-- Sample test
WITH new_test AS (
  INSERT INTO public.tests (title, chapter_id, total_marks)
  SELECT 'Real Numbers — Quick Quiz', c.id, 2
  FROM public.chapters c WHERE c.chapter_name = 'Real Numbers'
  RETURNING id
)
INSERT INTO public.questions (test_id, question_text, options, correct_option, marks, question_order)
SELECT id, 'Which of the following is an irrational number?',
  '["2/3","√2","0.5","-7"]'::jsonb, 1, 1, 1 FROM new_test
UNION ALL
SELECT id, 'The HCF of 6 and 20 is:',
  '["1","2","6","20"]'::jsonb, 1, 1, 2 FROM new_test;
