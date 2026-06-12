
-- 1) Profiles: block students from modifying sensitive columns
CREATE OR REPLACE FUNCTION public.profiles_guard_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.email := OLD.email;
    NEW.is_active := OLD.is_active;
    NEW.standard_id := OLD.standard_id;
    NEW.name := OLD.name;
    NEW.phone := OLD.phone;
    NEW.parent_phone := OLD.parent_phone;
    NEW.id := OLD.id;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_self_update ON public.profiles;
CREATE TRIGGER profiles_guard_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_self_update();

-- 2) user_talents: remove client-side insert/update; only server fn (service role) may mutate
DROP POLICY IF EXISTS "Students insert own talents" ON public.user_talents;
DROP POLICY IF EXISTS "Students update own talents" ON public.user_talents;

-- 3) pvp_duel_answers: hide opponent answers until duel finished
DROP POLICY IF EXISTS "Players can read answers in their duels" ON public.pvp_duel_answers;

CREATE POLICY "Players can read own answers always"
ON public.pvp_duel_answers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Players can read opponent answers when finished"
ON public.pvp_duel_answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pvp_duels d
    WHERE d.id = pvp_duel_answers.duel_id
      AND d.status = 'finished'
      AND (d.challenger_id = auth.uid() OR d.opponent_id = auth.uid())
  )
);
