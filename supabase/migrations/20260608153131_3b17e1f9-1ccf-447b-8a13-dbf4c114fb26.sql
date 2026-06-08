
CREATE TABLE public.talent_configs (
  talent_code TEXT PRIMARY KEY,
  max_tier INTEGER NOT NULL CHECK (max_tier > 0 AND max_tier <= 20),
  cost_per_tier INTEGER[] NOT NULL,
  per_tier_value NUMERIC NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.talent_configs TO authenticated;
GRANT ALL ON public.talent_configs TO service_role;

ALTER TABLE public.talent_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read talent configs"
  ON public.talent_configs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify talent configs"
  ON public.talent_configs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.talent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_code TEXT NOT NULL,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.talent_audit_log TO authenticated;
GRANT ALL ON public.talent_audit_log TO service_role;

ALTER TABLE public.talent_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read talent audit log"
  ON public.talent_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX talent_audit_log_code_idx ON public.talent_audit_log(talent_code, created_at DESC);

CREATE OR REPLACE FUNCTION public.tg_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER talent_configs_updated_at
  BEFORE UPDATE ON public.talent_configs
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_updated_at();
