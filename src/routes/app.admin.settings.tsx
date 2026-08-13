import { createFileRoute, Link } from "@tanstack/react-router";
import { Cog, Trophy, Megaphone, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";
import { HeadmasterHeader } from "@/components/admin/HeadmasterHeader";

export const Route = createFileRoute("/app/admin/settings")({
  head: () => ({ meta: [{ title: "Academy Settings — Academy Office" }] }),
  component: SettingsPage,
});

function SettingLink({ icon: Icon, title, desc, to, cta }: {
  icon: any; title: string; desc: string; to: string; cta: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="font-semibold flex items-center gap-2"><Icon className="h-4 w-4 text-amber-400" />{title}</div>
        <div className="text-sm text-muted-foreground">{desc}</div>
        <Link to={to} className="inline-block text-sm text-amber-400 hover:underline">{cta} →</Link>
      </CardContent>
    </Card>
  );
}

function SettingsPage() {
  const { role } = useAuth();
  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;

  return (
    <div className="space-y-5">
      <HeadmasterHeader
        icon={<Cog className="h-7 w-7" />}
        title="Academy Settings"
        tagline="Account preferences and Academy-wide configuration."
        lumi="Only the settings that actually do something live here."
      />

      <div className="grid gap-3 md:grid-cols-2">
        <SettingLink
          icon={Users}
          title="Account Preferences"
          desc="Your own account, username and password."
          to="/app/settings"
          cta="Open profile preferences"
        />
        <SettingLink
          icon={Megaphone}
          title="Announcements"
          desc="Broadcast a message to every Cadet from the Lumi Manager."
          to="/app/admin/lumi"
          cta="Open Lumi Manager"
        />
        <SettingLink
          icon={Trophy}
          title="Academy Ranks"
          desc="The promotion ladder is configured under Progress & Rewards → Ranks."
          to="/app/admin/progress"
          cta="Open Progress & Rewards"
        />
      </div>
    </div>
  );
}
