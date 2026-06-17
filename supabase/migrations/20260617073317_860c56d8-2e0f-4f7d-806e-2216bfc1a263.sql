
DROP POLICY IF EXISTS "Anyone signed in can read rooms" ON public.pvp_br_rooms;
DROP POLICY IF EXISTS "br_rooms_select" ON public.pvp_br_rooms;
DROP POLICY IF EXISTS "Players can read rooms" ON public.pvp_br_rooms;

CREATE POLICY "Members or admins can read rooms"
ON public.pvp_br_rooms
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pvp_br_players p
    WHERE p.room_id = pvp_br_rooms.id
      AND p.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
