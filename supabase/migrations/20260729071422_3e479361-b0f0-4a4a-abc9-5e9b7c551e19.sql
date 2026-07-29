
ALTER PUBLICATION supabase_realtime DROP TABLE public.pvp_duels;
ALTER PUBLICATION supabase_realtime DROP TABLE public.pvp_br_rooms;
ALTER PUBLICATION supabase_realtime DROP TABLE public.pvp_br_players;

DROP TABLE IF EXISTS public.pvp_duel_answers CASCADE;
DROP TABLE IF EXISTS public.pvp_duels CASCADE;
DROP TABLE IF EXISTS public.pvp_br_questions CASCADE;
DROP TABLE IF EXISTS public.pvp_br_players CASCADE;
DROP TABLE IF EXISTS public.pvp_br_rooms CASCADE;
