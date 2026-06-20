import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { checkSetupNeeded } from "@/lib/api/academy.functions";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: "/app" });
    }
    const status = await checkSetupNeeded();
    if (status.setupNeeded) throw redirect({ to: "/setup" });
    throw redirect({ to: "/login" });
  },
  component: () => null,
});
