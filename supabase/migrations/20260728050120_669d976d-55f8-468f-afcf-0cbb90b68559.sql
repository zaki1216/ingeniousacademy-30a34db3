
CREATE TABLE public.academy_ranks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'Award',
  color text NOT NULL DEFAULT '#fbbf24',
  gradient text NOT NULL DEFAULT 'linear-gradient(135deg,#78350f,#f59e0b)',
  xp_required integer NOT NULL DEFAULT 0,
  message text,
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.academy_ranks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.academy_ranks TO authenticated;
GRANT ALL ON public.academy_ranks TO service_role;

ALTER TABLE public.academy_ranks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view enabled ranks"
  ON public.academy_ranks FOR SELECT
  USING (enabled = true OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert ranks"
  ON public.academy_ranks FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update ranks"
  ON public.academy_ranks FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete ranks"
  ON public.academy_ranks FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER academy_ranks_set_updated_at
  BEFORE UPDATE ON public.academy_ranks
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_updated_at();

INSERT INTO public.academy_ranks (code, name, icon, color, gradient, xp_required, message, sort_order) VALUES
  ('novice',      'Novice Scholar',    'Sparkles',   '#94a3b8', 'linear-gradient(135deg,#475569,#94a3b8)',            0,     'Every legend starts here. Welcome, Scholar!', 1),
  ('apprentice',  'Apprentice',        'BookOpen',   '#22d3ee', 'linear-gradient(135deg,#0891b2,#22d3ee)',            500,   'You are learning the ways of the Academy.',   2),
  ('explorer',    'Explorer',          'Compass',    '#34d399', 'linear-gradient(135deg,#059669,#34d399)',            1500,  'Curiosity is your greatest weapon.',           3),
  ('pathfinder',  'Pathfinder',        'Map',        '#60a5fa', 'linear-gradient(135deg,#1d4ed8,#60a5fa)',            3500,  'You are forging your own path of knowledge.',  4),
  ('seeker',      'Knowledge Seeker',  'Telescope',  '#a78bfa', 'linear-gradient(135deg,#6d28d9,#a78bfa)',            7000,  'Wisdom answers those who seek it bravely.',    5),
  ('champion',    'Academy Champion',  'Shield',     '#fb7185', 'linear-gradient(135deg,#be123c,#fb7185)',            12000, 'The Academy salutes your dedication!',         6),
  ('master',      'Master Scholar',    'GraduationCap','#fbbf24','linear-gradient(135deg,#b45309,#fbbf24)',           20000, 'Few walk the halls with your mastery.',        7),
  ('grandmaster', 'Grand Master',      'Crown',      '#f0abfc', 'linear-gradient(135deg,#a21caf,#f0abfc,#22d3ee)',    32000, 'Your name echoes through every hall.',         8),
  ('legend',      'Legend',            'Trophy',     '#fde68a', 'linear-gradient(135deg,#6d4cff,#a855f7,#fbbf24,#ff3b6b)', 50000, 'You are the legend the Academy will remember forever.', 9);
