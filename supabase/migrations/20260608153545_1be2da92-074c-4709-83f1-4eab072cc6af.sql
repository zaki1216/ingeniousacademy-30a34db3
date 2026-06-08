
-- ============ ASYNC DUELS ============
CREATE TABLE public.pvp_duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending | accepted | challenger_done | opponent_done | finished | declined | expired
  question_ids UUID[] NOT NULL,
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  challenger_score INTEGER NOT NULL DEFAULT 0,
  opponent_score INTEGER NOT NULL DEFAULT 0,
  prize_coins INTEGER NOT NULL DEFAULT 50,
  prize_xp INTEGER NOT NULL DEFAULT 30,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (challenger_id <> opponent_id)
);

GRANT SELECT, INSERT, UPDATE ON public.pvp_duels TO authenticated;
GRANT ALL ON public.pvp_duels TO service_role;

ALTER TABLE public.pvp_duels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can read their own duels"
  ON public.pvp_duels FOR SELECT TO authenticated
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE POLICY "Challenger can create duels"
  ON public.pvp_duels FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = challenger_id);

CREATE INDEX pvp_duels_opponent_idx ON public.pvp_duels(opponent_id, status);
CREATE INDEX pvp_duels_challenger_idx ON public.pvp_duels(challenger_id, status);

CREATE TABLE public.pvp_duel_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID NOT NULL REFERENCES public.pvp_duels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  selected TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  time_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (duel_id, user_id, question_id)
);

GRANT SELECT, INSERT ON public.pvp_duel_answers TO authenticated;
GRANT ALL ON public.pvp_duel_answers TO service_role;

ALTER TABLE public.pvp_duel_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can read answers in their duels"
  ON public.pvp_duel_answers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pvp_duels d
    WHERE d.id = duel_id AND (d.challenger_id = auth.uid() OR d.opponent_id = auth.uid())
  ));

CREATE POLICY "Players can write their own answers"
  ON public.pvp_duel_answers FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.pvp_duels d
      WHERE d.id = duel_id AND (d.challenger_id = auth.uid() OR d.opponent_id = auth.uid())
    )
  );

-- ============ BATTLE ROYALE ============
CREATE TABLE public.pvp_br_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting | active | finished
  current_question_index INTEGER NOT NULL DEFAULT -1,
  max_players INTEGER NOT NULL DEFAULT 30,
  prize_coins INTEGER NOT NULL DEFAULT 200,
  prize_xp INTEGER NOT NULL DEFAULT 100,
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.pvp_br_rooms TO authenticated;
GRANT ALL ON public.pvp_br_rooms TO service_role;

ALTER TABLE public.pvp_br_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read rooms"
  ON public.pvp_br_rooms FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone signed in can create rooms as host"
  ON public.pvp_br_rooms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE TABLE public.pvp_br_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.pvp_br_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  eliminated BOOLEAN NOT NULL DEFAULT false,
  eliminated_at_index INTEGER,
  finish_place INTEGER,
  score INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.pvp_br_players TO authenticated;
GRANT ALL ON public.pvp_br_players TO service_role;

ALTER TABLE public.pvp_br_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read players in any room"
  ON public.pvp_br_players FOR SELECT TO authenticated USING (true);

CREATE POLICY "Players can join rooms as themselves"
  ON public.pvp_br_players FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pvp_br_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.pvp_br_rooms(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  order_index INTEGER NOT NULL,
  UNIQUE (room_id, order_index)
);

GRANT SELECT ON public.pvp_br_questions TO authenticated;
GRANT ALL ON public.pvp_br_questions TO service_role;

ALTER TABLE public.pvp_br_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players in a room can read its questions"
  ON public.pvp_br_questions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pvp_br_players p
    WHERE p.room_id = pvp_br_questions.room_id AND p.user_id = auth.uid()
  ));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pvp_duels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pvp_br_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pvp_br_players;

-- updated_at triggers
CREATE TRIGGER pvp_duels_updated_at
  BEFORE UPDATE ON public.pvp_duels
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_updated_at();

CREATE TRIGGER pvp_br_rooms_updated_at
  BEFORE UPDATE ON public.pvp_br_rooms
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_updated_at();
