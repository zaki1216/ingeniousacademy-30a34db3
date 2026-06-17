
CREATE TABLE public.pass_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pass_id UUID NOT NULL REFERENCES public.user_passes(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  reason TEXT,
  prev_status TEXT,
  new_status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX pass_audit_log_pass_idx ON public.pass_audit_log (pass_id, created_at DESC);
CREATE INDEX pass_audit_log_admin_idx ON public.pass_audit_log (admin_user_id, created_at DESC);

GRANT SELECT, INSERT ON public.pass_audit_log TO authenticated;
GRANT ALL ON public.pass_audit_log TO service_role;

ALTER TABLE public.pass_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read pass audit log"
ON public.pass_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert pass audit log"
ON public.pass_audit_log FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
