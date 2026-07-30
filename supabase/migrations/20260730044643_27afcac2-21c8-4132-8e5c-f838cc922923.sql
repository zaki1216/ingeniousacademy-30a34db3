ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS parent_name text,
  ADD COLUMN IF NOT EXISTS parent_whatsapp text,
  ADD COLUMN IF NOT EXISTS roll_number text,
  ADD COLUMN IF NOT EXISTS admission_date date,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS username_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS username_locked boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key
  ON public.profiles (lower(username)) WHERE username IS NOT NULL;

CREATE OR REPLACE FUNCTION public.profiles_guard_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.email := OLD.email;
    NEW.is_active := OLD.is_active;
    NEW.standard_id := OLD.standard_id;
    NEW.name := OLD.name;
    NEW.phone := OLD.phone;
    NEW.parent_phone := OLD.parent_phone;
    NEW.id := OLD.id;
    NEW.created_at := OLD.created_at;
    NEW.parent_name := OLD.parent_name;
    NEW.parent_whatsapp := OLD.parent_whatsapp;
    NEW.roll_number := OLD.roll_number;
    NEW.admission_date := OLD.admission_date;
    NEW.username_locked := OLD.username_locked;

    IF NEW.username IS DISTINCT FROM OLD.username THEN
      IF COALESCE(OLD.username_locked, false) THEN
        RAISE EXCEPTION 'Username changes are locked for this account';
      END IF;
      IF OLD.username_changed_at IS NOT NULL AND OLD.username_changed_at > now() - interval '30 days' THEN
        RAISE EXCEPTION 'You can change your username once every 30 days';
      END IF;
      IF NEW.username !~ '^[A-Za-z0-9_.]{4,20}$' THEN
        RAISE EXCEPTION 'Invalid username format';
      END IF;
      NEW.username_changed_at := now();
    ELSE
      NEW.username_changed_at := OLD.username_changed_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profiles_guard_self_update_trg ON public.profiles;
CREATE TRIGGER profiles_guard_self_update_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_self_update();