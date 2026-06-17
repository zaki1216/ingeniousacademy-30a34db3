import { createFileRoute, Link } from "@tanstack/react-router";
import { Megaphone, Settings as SettingsIcon, Newspaper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";

export const Route = createFileRoute("/app/admin/settings")({ component: SettingsHub });

const tiles = [
  { to: "/app/announcements", label: "News", desc: "Recent news posts", icon: Newspaper },
  { to: "/app/announcements", label: "Announcements", desc: "Compose announcements", icon: Megaphone },
  { to: "/app/settings", label: "System Settings", desc: "Account & system config", icon: SettingsIcon },
];

function SettingsHub() {
  const { role } = useAuth();
  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">News, announcements, system</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {tiles.map((t, i) => {
          const Icon = t.icon;
          return (
            <Link key={i} to={t.to}>
              <Card className="hover:border-primary/50 transition">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold">{t.label}</div>
                    <div className="text-xs text-muted-foreground">{t.desc}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
