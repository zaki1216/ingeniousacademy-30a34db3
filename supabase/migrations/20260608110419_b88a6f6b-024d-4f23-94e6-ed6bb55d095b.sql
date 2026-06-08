
-- 1. is_boss flag on tests
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS is_boss boolean NOT NULL DEFAULT false;

-- 2. gamification_stats
CREATE TABLE public.gamification_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  coins integer NOT NULL DEFAULT 0,
  streak_days integer NOT NULL DEFAULT 0,
  max_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.gamification_stats TO authenticated;
GRANT ALL ON public.gamification_stats TO service_role;
ALTER TABLE public.gamification_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gam_stats_self_select" ON public.gamification_stats FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "gam_stats_leaderboard_select" ON public.gamification_stats FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "gam_stats_self_upsert" ON public.gamification_stats FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "gam_stats_self_update" ON public.gamification_stats FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. video_completions
CREATE TABLE public.video_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lecture_id uuid NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lecture_id)
);
GRANT SELECT, INSERT ON public.video_completions TO authenticated;
GRANT ALL ON public.video_completions TO service_role;
ALTER TABLE public.video_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vc_self_select" ON public.video_completions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "vc_self_insert" ON public.video_completions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 4. xp_transactions
CREATE TABLE public.xp_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX xp_tx_user_created_idx ON public.xp_transactions(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.xp_transactions TO authenticated;
GRANT ALL ON public.xp_transactions TO service_role;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_tx_self_select" ON public.xp_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "xp_tx_self_insert" ON public.xp_transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5. coin_transactions
CREATE TABLE public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coin_tx_user_created_idx ON public.coin_transactions(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.coin_transactions TO authenticated;
GRANT ALL ON public.coin_transactions TO service_role;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coin_tx_self_select" ON public.coin_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "coin_tx_self_insert" ON public.coin_transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 6. achievements catalog
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  category text NOT NULL,
  requirement_type text NOT NULL,
  requirement_value integer NOT NULL,
  xp_reward integer NOT NULL DEFAULT 0,
  coin_reward integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ach_select_all" ON public.achievements FOR SELECT TO authenticated USING (true);

-- 7. user_achievements
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);
GRANT SELECT, INSERT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ua_self_select" ON public.user_achievements FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ua_self_insert" ON public.user_achievements FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 8. seed achievements
INSERT INTO public.achievements (code, name, description, icon, category, requirement_type, requirement_value, xp_reward, coin_reward) VALUES
  ('first_video','First Steps','Watch your first lecture','PlayCircle','learning','videos_watched',1,20,10),
  ('videos_10','Curious Mind','Watch 10 lectures','BookOpen','learning','videos_watched',10,100,50),
  ('videos_50','Knowledge Seeker','Watch 50 lectures','GraduationCap','learning','videos_watched',50,500,200),
  ('first_quiz','Quiz Rookie','Complete your first quiz','ClipboardCheck','quiz','quizzes_taken',1,20,10),
  ('quiz_perfect','Perfect Score','Score 100% on a quiz','Star','quiz','perfect_quizzes',1,150,75),
  ('streak_3','On Fire','Maintain a 3-day streak','Flame','streak','streak_days',3,50,25),
  ('streak_7','Week Warrior','Maintain a 7-day streak','Flame','streak','streak_days',7,150,75),
  ('streak_30','Unstoppable','Maintain a 30-day streak','Flame','streak','streak_days',30,1000,500),
  ('level_5','Rising Star','Reach level 5','TrendingUp','level','level',5,100,50),
  ('level_10','Scholar','Reach level 10','Award','level','level',10,300,150),
  ('level_25','Master','Reach level 25','Trophy','level','level',25,1000,500),
  ('coins_500','Coin Collector','Earn 500 coins total','Coins','coins','coins_earned',500,100,0),
  ('boss_slayer','Boss Slayer','Defeat your first Boss Quiz','Sword','boss','bosses_defeated',1,200,100);
