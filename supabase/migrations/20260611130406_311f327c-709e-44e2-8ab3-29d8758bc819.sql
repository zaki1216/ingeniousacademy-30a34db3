DROP POLICY IF EXISTS "Anyone signed in can read players in any room" ON public.pvp_br_players;

CREATE POLICY "Players can read participants of their rooms"
ON public.pvp_br_players
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.pvp_br_players p2
    WHERE p2.room_id = pvp_br_players.room_id
      AND p2.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);