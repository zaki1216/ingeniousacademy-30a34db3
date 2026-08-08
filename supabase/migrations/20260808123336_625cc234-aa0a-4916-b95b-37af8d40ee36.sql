REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.coin_transactions, public.xp_transactions, public.gamification_stats, public.user_inventory FROM anon, authenticated;
REVOKE SELECT ON public.coin_transactions, public.xp_transactions, public.gamification_stats, public.user_inventory FROM anon;
GRANT SELECT ON public.coin_transactions, public.xp_transactions, public.gamification_stats, public.user_inventory TO authenticated;
GRANT ALL ON public.coin_transactions, public.xp_transactions, public.gamification_stats, public.user_inventory TO service_role;