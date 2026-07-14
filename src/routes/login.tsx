import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { checkSetupNeeded } from "@/lib/api/academy.functions";
import { EntryFlow } from "@/components/entry/EntryFlow";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "admin" ? ("admin" as const) : ("student" as const),
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/app" });
    const status = await checkSetupNeeded();
    if (status.setupNeeded) throw redirect({ to: "/setup" });
  },
  component: LoginPage,
});

function LoginPage() {
  const { mode } = Route.useSearch();
  return <EntryFlow initialMode={mode} />;
}
