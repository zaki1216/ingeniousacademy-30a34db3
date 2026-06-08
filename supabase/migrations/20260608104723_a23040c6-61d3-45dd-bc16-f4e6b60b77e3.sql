-- 1. Restrict questions reads to admins only (students go through server function)
DROP POLICY IF EXISTS "questions_select" ON public.questions;

-- 2. Prevent duplicate result submissions for same student+test
ALTER TABLE public.results
  ADD CONSTRAINT results_student_test_unique UNIQUE (student_id, test_id);

-- 3. Lock down has_role: revoke from PUBLIC and anon, keep authenticated + service_role
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
