
CREATE TABLE public.daily_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_type text NOT NULL,
  reward_value text NOT NULL,
  reward_amount integer NOT NULL DEFAULT 0,
  prize_label text NOT NULL,
  rarity text NOT NULL DEFAULT 'common',
  streak integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.daily_spins TO authenticated;
GRANT ALL ON public.daily_spins TO service_role;

ALTER TABLE public.daily_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own spins"
ON public.daily_spins FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own spins"
ON public.daily_spins FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_daily_spins_user_created ON public.daily_spins(user_id, created_at DESC);
