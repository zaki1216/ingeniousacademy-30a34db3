
CREATE TABLE public.user_talents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  talent_code text NOT NULL,
  tier integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, talent_code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_talents TO authenticated;
GRANT ALL ON public.user_talents TO service_role;

ALTER TABLE public.user_talents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own talents"
  ON public.user_talents FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students insert own talents"
  ON public.user_talents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students update own talents"
  ON public.user_talents FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.gamification_stats
  ADD COLUMN IF NOT EXISTS talent_points_spent integer NOT NULL DEFAULT 0;
