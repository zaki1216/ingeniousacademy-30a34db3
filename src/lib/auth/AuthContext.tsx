import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "student";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchRole(userId: string): Promise<AppRole | null> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.role as AppRole | undefined) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionUserIdRef = useRef<string | null>(null);
  const authEventVersionRef = useRef(0);

  const loadRole = async (s: Session | null, version: number) => {
    if (!s?.user) {
      setRole(null);
      return;
    }
    const r = await fetchRole(s.user.id);
    if (authEventVersionRef.current !== version || sessionUserIdRef.current !== s.user.id) return;
    setRole(r);
  };

  useEffect(() => {
    let mounted = true;
    const applySession = (s: Session | null, version: number) => {
      if (!mounted || authEventVersionRef.current !== version) return;
      sessionUserIdRef.current = s?.user?.id ?? null;
      setSession(s);
      setLoading(false);
      setTimeout(() => {
        if (mounted) void loadRole(s, version);
      }, 0);
    };

    const initialVersion = authEventVersionRef.current;
    supabase.auth.getSession().then(async ({ data }) => {
      applySession(data.session, initialVersion);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      authEventVersionRef.current += 1;
      applySession(s, authEventVersionRef.current);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refresh = async () => {
    authEventVersionRef.current += 1;
    const version = authEventVersionRef.current;
    const { data } = await supabase.auth.getSession();
    sessionUserIdRef.current = data.session?.user?.id ?? null;
    setSession(data.session);
    setLoading(false);
    await loadRole(data.session, version);
  };

  const signOut = async () => {
    authEventVersionRef.current += 1;
    await supabase.auth.signOut();
    sessionUserIdRef.current = null;
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, role, loading, refresh, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
