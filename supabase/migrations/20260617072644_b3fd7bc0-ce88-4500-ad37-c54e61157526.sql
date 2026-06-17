
-- 1. Spin prize configs (admin-editable)
CREATE TABLE public.spin_prize_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  icon text NOT NULL DEFAULT '🎁',
  color text NOT NULL DEFAULT '#facc15',
  reward_type text NOT NULL,
  reward_value text NOT NULL,
  reward_amount integer NOT NULL DEFAULT 0,
  rarity text NOT NULL DEFAULT 'common',
  weight numeric NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spin_prize_configs_weight_check CHECK (weight >= 0),
  CONSTRAINT spin_prize_configs_rarity_check CHECK (rarity IN ('common','rare','epic','legendary')),
  CONSTRAINT spin_prize_configs_type_check CHECK (reward_type IN ('coins','xp','key','badge','pass','shadow','pet'))
);

GRANT SELECT ON public.spin_prize_configs TO authenticated;
GRANT ALL ON public.spin_prize_configs TO service_role;

ALTER TABLE public.spin_prize_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view enabled prizes"
ON public.spin_prize_configs FOR SELECT
TO authenticated
USING (enabled OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage spin prizes"
ON public.spin_prize_configs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_spin_prize_configs_updated_at
BEFORE UPDATE ON public.spin_prize_configs
FOR EACH ROW EXECUTE FUNCTION public.tg_update_updated_at();

-- 2. Prevent double daily spins: unique per user per UTC day
CREATE UNIQUE INDEX uniq_daily_spins_user_utc_day
ON public.daily_spins (
  user_id,
  ((created_at AT TIME ZONE 'UTC')::date)
);

-- 3. Seed defaults
INSERT INTO public.spin_prize_configs (code, label, icon, color, reward_type, reward_value, reward_amount, rarity, weight, sort_order) VALUES
('c100',   '100 Coins',              '🪙', '#facc15', 'coins',  'coins',           100,  'common',    28, 10),
('x50',    '50 XP',                  '✨', '#38bdf8', 'xp',     'xp',              50,   'common',    22, 20),
('c500',   '500 Coins',              '💰', '#f59e0b', 'coins',  'coins',           500,  'rare',      14, 30),
('x200',   '200 XP',                 '🌟', '#0ea5e9', 'xp',     'xp',              200,  'rare',      12, 40),
('key',    'Lucky Key',              '🗝️', '#a78bfa', 'key',    'lucky_key',       1,    'rare',      9,  50),
('badge',  'Spin Badge',             '🏅', '#22c55e', 'badge',  'spin_badge',      1,    'epic',      6,  60),
('pass',   'Streak Shield Pass',     '🛡️', '#ef4444', 'pass',   'streak_shield',   1,    'epic',      5,  70),
('c2k',    '2,000 Coins',            '💎', '#ec4899', 'coins',  'coins',           2000, 'epic',      3,  80),
('shadow', 'Mystery Shadow',         '👤', '#7c3aed', 'shadow', 'mystery_shadow',  1,    'legendary', 0.7, 90),
('pet',    'Mystery Pet',            '🐾', '#f43f5e', 'pet',    'mystery_pet',     1,    'legendary', 0.3, 100)
ON CONFLICT (code) DO NOTHING;
