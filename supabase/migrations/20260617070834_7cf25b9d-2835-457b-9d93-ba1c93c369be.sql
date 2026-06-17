
CREATE TABLE public.user_passes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pass_code TEXT NOT NULL,
  cost_coins INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX user_passes_user_created_idx ON public.user_passes (user_id, created_at DESC);
CREATE INDEX user_passes_status_idx ON public.user_passes (status);
CREATE INDEX user_passes_user_pass_idx ON public.user_passes (user_id, pass_code, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_passes TO authenticated;
GRANT ALL ON public.user_passes TO service_role;

ALTER TABLE public.user_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view their own passes"
ON public.user_passes FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students create their own passes"
ON public.user_passes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update any pass"
ON public.user_passes FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete passes"
ON public.user_passes FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER user_passes_set_updated_at
BEFORE UPDATE ON public.user_passes
FOR EACH ROW EXECUTE FUNCTION public.tg_update_updated_at();
