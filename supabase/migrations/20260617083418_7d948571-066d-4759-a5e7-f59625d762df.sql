
-- TITLES catalog
CREATE TABLE public.titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  rarity text NOT NULL DEFAULT 'common',
  requirement_type text,
  requirement_value int,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.titles TO authenticated;
GRANT ALL ON public.titles TO service_role;
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "titles readable by all signed in" ON public.titles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage titles" ON public.titles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- USER TITLES
CREATE TABLE public.user_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title_code text NOT NULL REFERENCES public.titles(code) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, title_code)
);
GRANT SELECT ON public.user_titles TO authenticated;
GRANT ALL ON public.user_titles TO service_role;
ALTER TABLE public.user_titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_titles self read" ON public.user_titles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

-- SHADOWS catalog
CREATE TABLE public.shadows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  subject text,
  rarity text NOT NULL DEFAULT 'common',
  description text,
  unlock_rule text,
  icon text DEFAULT '👤',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shadows TO authenticated;
GRANT ALL ON public.shadows TO service_role;
ALTER TABLE public.shadows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shadows readable by all signed in" ON public.shadows FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage shadows" ON public.shadows FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- USER SHADOWS
CREATE TABLE public.user_shadows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shadow_code text NOT NULL REFERENCES public.shadows(code) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, shadow_code)
);
GRANT SELECT ON public.user_shadows TO authenticated;
GRANT ALL ON public.user_shadows TO service_role;
ALTER TABLE public.user_shadows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_shadows self read" ON public.user_shadows FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

-- SEASONS catalog
CREATE TABLE public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  theme text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  rewards jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seasons TO authenticated;
GRANT ALL ON public.seasons TO service_role;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons readable by all signed in" ON public.seasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage seasons" ON public.seasons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- SEASON PROGRESS
CREATE TABLE public.season_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  points int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, season_id)
);
GRANT SELECT ON public.season_progress TO authenticated;
GRANT ALL ON public.season_progress TO service_role;
ALTER TABLE public.season_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "season_progress self read" ON public.season_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

-- SEED titles
INSERT INTO public.titles (code, name, description, rarity, requirement_type, requirement_value) VALUES
('rookie_hunter','Rookie Hunter','Begin your adventure','common','level',1),
('dungeon_explorer','Dungeon Explorer','Watch your first lecture','common','lectures',1),
('homework_slayer','Homework Slayer','Complete 10 lectures','rare','lectures',10),
('quiz_assassin','Quiz Assassin','Ace 5 quizzes','rare','quizzes',5),
('algebra_warrior','Algebra Warrior','Conquer the Algebra dungeon','epic','subject_math',1),
('science_mage','Science Mage','Master the Science realm','epic','subject_science',1),
('rank_climber','Rank Climber','Reach C-Rank','rare','level',10),
('elite_scholar','Elite Scholar','Reach A-Rank','epic','level',28),
('s_rank_hunter','S-Rank Hunter','Reach S-Rank','legendary','level',40),
('monarch_candidate','Monarch Candidate','Reach the Monarch tier','mythic','level',75)
ON CONFLICT (code) DO NOTHING;

-- SEED shadows
INSERT INTO public.shadows (code, name, subject, rarity, description, unlock_rule, icon) VALUES
('algebra_knight','Algebra Knight','Math','rare','A loyal blade forged from perfect equations.','Complete the Algebra dungeon','⚔️'),
('geometry_archer','Geometry Archer','Math','rare','Strikes from impossible angles.','Complete the Geometry fortress','🏹'),
('motion_warrior','Motion Warrior','Science','epic','Charges with the force of physics itself.','Complete the Motion dungeon','💨'),
('grammar_sage','Grammar Sage','Language','rare','Speaks in cadence that bends fate.','Complete the Grammar citadel','📜'),
('atom_mage','Atom Mage','Science','legendary','Bends matter to its will.','Complete the Atomic Theory dungeon','⚛️')
ON CONFLICT (code) DO NOTHING;

-- SEED current season
INSERT INTO public.seasons (code, name, theme, starts_at, ends_at, rewards) VALUES
('s_science_conquerors','Science Conquerors','science',
  date_trunc('month', now()),
  date_trunc('month', now()) + interval '1 month' - interval '1 second',
  '[{"type":"title","code":"science_mage"},{"type":"shadow","code":"atom_mage"},{"type":"badge","code":"season_champion"}]'::jsonb)
ON CONFLICT (code) DO NOTHING;
