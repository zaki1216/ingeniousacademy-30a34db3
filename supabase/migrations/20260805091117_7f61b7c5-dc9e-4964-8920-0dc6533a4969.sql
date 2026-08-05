-- 1) Permanent legacy events
CREATE TABLE public.legacy_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  code text NOT NULL,
  icon text NOT NULL DEFAULT '⭐',
  title text NOT NULL,
  detail text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
GRANT SELECT ON public.legacy_events TO authenticated;
GRANT ALL ON public.legacy_events TO service_role;
ALTER TABLE public.legacy_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own legacy events" ON public.legacy_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all legacy events" ON public.legacy_events
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX legacy_events_user_time_idx ON public.legacy_events (user_id, occurred_at DESC);

-- 2) Graduation certificates
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  subject_name text NOT NULL,
  standard_name text,
  student_name text NOT NULL,
  username text,
  rank_name text,
  serial text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, subject_id)
);
GRANT SELECT ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own certificates" ON public.certificates
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all certificates" ON public.certificates
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER certificates_set_updated_at BEFORE UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_updated_at();

-- 3) Academy titles (extends existing titles catalog)
ALTER TABLE public.titles ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT '🎖️';
ALTER TABLE public.titles ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.titles ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

INSERT INTO public.titles (code, name, description, rarity, requirement_type, requirement_value, icon, sort_order)
VALUES
  ('quest_master', 'Quest Master', 'Complete 100 Quests across the Academy', 'epic', 'lessons', 100, '📘', 10),
  ('academy_champion', 'Academy Champion', 'Clear 25 Dungeons', 'epic', 'dungeons', 25, '🏆', 20),
  ('grand_scholar', 'Grand Scholar', 'Graduate from 3 Academy subjects', 'legendary', 'graduations', 3, '🎓', 30),
  ('guardian_slayer', 'Guardian Slayer', 'Win 10 Master Trials', 'rare', 'master_trials', 10, '⚔️', 40),
  ('first_steps', 'Academy Cadet', 'Complete your very first Quest', 'common', 'lessons', 1, '🌱', 5)
ON CONFLICT (code) DO NOTHING;

-- 4) Legacy settings (single configuration row)
CREATE TABLE public.legacy_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  headmaster_name text NOT NULL DEFAULT 'The Headmaster',
  headmaster_signature text NOT NULL DEFAULT 'Ingenious Academy',
  seal_text text NOT NULL DEFAULT 'Ingenious Academy',
  graduation_threshold integer NOT NULL DEFAULT 100,
  celebrations_enabled boolean NOT NULL DEFAULT true,
  ceremony_enabled boolean NOT NULL DEFAULT true,
  hall_categories jsonb NOT NULL DEFAULT '["certificates","titles","badges","trophies","awards"]'::jsonb,
  certificate_note text NOT NULL DEFAULT 'Awarded for outstanding dedication and the completion of every Quest in this subject.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.legacy_settings TO authenticated;
GRANT ALL ON public.legacy_settings TO service_role;
ALTER TABLE public.legacy_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in reads legacy settings" ON public.legacy_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage legacy settings" ON public.legacy_settings
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER legacy_settings_set_updated_at BEFORE UPDATE ON public.legacy_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_updated_at();

INSERT INTO public.legacy_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;