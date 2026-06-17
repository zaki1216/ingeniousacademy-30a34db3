
-- Move has_role out of exposed public schema into private schema so signed-in users
-- cannot invoke it via PostgREST RPC. RLS policies are rewritten to call private.has_role.

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Rewrite every policy that references public.has_role(...) so it calls private.has_role(...)
DO $do$
DECLARE
  r record;
  cmd_kw text;
  roles_txt text;
  new_qual text;
  new_check text;
  sql_stmt text;
BEGIN
  FOR r IN
    SELECT n.nspname AS sch,
           c.relname AS tbl,
           p.polname,
           p.polcmd,
           p.polpermissive,
           p.polroles,
           pg_get_expr(p.polqual, p.polrelid) AS qual,
           pg_get_expr(p.polwithcheck, p.polrelid) AS wcheck
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND ( pg_get_expr(p.polqual, p.polrelid) LIKE '%has_role(%'
         OR pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%has_role(%' )
  LOOP
    cmd_kw := CASE r.polcmd
                WHEN 'r' THEN 'SELECT'
                WHEN 'a' THEN 'INSERT'
                WHEN 'w' THEN 'UPDATE'
                WHEN 'd' THEN 'DELETE'
                WHEN '*' THEN 'ALL'
              END;

    -- Build TO roles list (roles are oids; convert to names; treat 0 as PUBLIC)
    SELECT string_agg(
             CASE WHEN ro = 0 THEN 'PUBLIC' ELSE quote_ident((ro::regrole)::text) END,
             ', '
           )
      INTO roles_txt
    FROM unnest(r.polroles) AS ro;

    new_qual  := regexp_replace(COALESCE(r.qual,  ''), 'has_role\(', 'private.has_role(', 'g');
    new_check := regexp_replace(COALESCE(r.wcheck,''), 'has_role\(', 'private.has_role(', 'g');

    EXECUTE format('DROP POLICY %I ON %I.%I', r.polname, r.sch, r.tbl);

    sql_stmt := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
                       r.polname, r.sch, r.tbl,
                       CASE WHEN r.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                       cmd_kw,
                       COALESCE(roles_txt, 'PUBLIC'));

    IF new_qual <> '' THEN
      sql_stmt := sql_stmt || format(' USING (%s)', new_qual);
    END IF;
    IF new_check <> '' THEN
      sql_stmt := sql_stmt || format(' WITH CHECK (%s)', new_check);
    END IF;

    EXECUTE sql_stmt;
  END LOOP;
END
$do$;

-- Update profiles_guard_self_update trigger which also calls public.has_role
CREATE OR REPLACE FUNCTION public.profiles_guard_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  END IF;
  RETURN NEW;
END;
$function$;

-- Finally drop the public.has_role wrapper so PostgREST no longer exposes it
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
