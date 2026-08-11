DROP POLICY IF EXISTS "Anyone can view enabled ranks" ON public.academy_ranks;

CREATE POLICY "Anon can view enabled ranks"
ON public.academy_ranks FOR SELECT TO anon
USING (enabled = true);

CREATE POLICY "Users can view enabled ranks"
ON public.academy_ranks FOR SELECT TO authenticated
USING (enabled = true OR private.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.academy_ranks TO anon;