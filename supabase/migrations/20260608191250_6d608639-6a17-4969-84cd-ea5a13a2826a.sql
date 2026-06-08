
DROP POLICY IF EXISTS coin_tx_self_insert ON public.coin_transactions;
DROP POLICY IF EXISTS xp_tx_self_insert ON public.xp_transactions;
DROP POLICY IF EXISTS results_self_insert ON public.results;
DROP POLICY IF EXISTS ua_self_insert ON public.user_achievements;
DROP POLICY IF EXISTS gam_stats_self_update ON public.gamification_stats;
DROP POLICY IF EXISTS gam_stats_self_upsert ON public.gamification_stats;
DROP POLICY IF EXISTS gam_stats_leaderboard_select ON public.gamification_stats;
