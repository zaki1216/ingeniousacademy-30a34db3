
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present','absent')),
  coins_delta INTEGER NOT NULL DEFAULT 0,
  marked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage attendance"
  ON public.attendance FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view own attendance"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE TRIGGER attendance_updated_at
BEFORE UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.tg_update_updated_at();

CREATE INDEX attendance_date_idx ON public.attendance (date DESC);
CREATE INDEX attendance_student_idx ON public.attendance (student_id, date DESC);
