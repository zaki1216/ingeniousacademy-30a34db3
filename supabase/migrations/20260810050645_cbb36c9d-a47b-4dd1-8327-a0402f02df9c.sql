-- 1) gamification_stats: explicitly deny all client writes; reads stay owner/admin scoped.
REVOKE INSERT, UPDATE, DELETE ON public.gamification_stats FROM anon, authenticated;
REVOKE ALL ON public.gamification_stats FROM anon;
GRANT SELECT ON public.gamification_stats TO authenticated;
GRANT ALL ON public.gamification_stats TO service_role;

DROP POLICY IF EXISTS "gam_stats_no_client_insert" ON public.gamification_stats;
DROP POLICY IF EXISTS "gam_stats_no_client_update" ON public.gamification_stats;
DROP POLICY IF EXISTS "gam_stats_no_client_delete" ON public.gamification_stats;
CREATE POLICY "gam_stats_no_client_insert" ON public.gamification_stats
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "gam_stats_no_client_update" ON public.gamification_stats
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "gam_stats_no_client_delete" ON public.gamification_stats
  FOR DELETE TO authenticated USING (false);

-- 2) user_passes: students may not self-insert (cost_coins/pass_code were unvalidated).
DROP POLICY IF EXISTS "Students create their own pending passes" ON public.user_passes;
CREATE POLICY "No client pass inserts" ON public.user_passes
  FOR INSERT TO authenticated WITH CHECK (false);

REVOKE INSERT ON public.user_passes FROM anon, authenticated;
REVOKE ALL ON public.user_passes FROM anon;
GRANT SELECT ON public.user_passes TO authenticated;
GRANT UPDATE, DELETE ON public.user_passes TO authenticated; -- admin-only via RLS
GRANT ALL ON public.user_passes TO service_role;