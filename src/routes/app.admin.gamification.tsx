import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Ticket, Gift, Award, Crown, CalendarRange, CalendarCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";

export const Route = createFileRoute("/app/admin/gamification")({ component: GamificationHub });

const tiles = [
  { to: "/app/admin/attendance", label: "Attendance", desc: "Mark present/absent (+1 / −1 coin)", icon: CalendarCheck },
  { to: "/app/admin/talents", label: "Talents", desc: "Tier costs & multipliers", icon: Sparkles },
  { to: "/app/admin/passes", label: "Pass Approvals", desc: "Review pending requests", icon: Ticket },
  { to: "/app/admin/spin", label: "Spin Wheel", desc: "Prize weights & rewards", icon: Gift },
  { to: "/app/admin/spin", label: "Rewards", desc: "Configure reward catalog", icon: Award },
  { to: "/app/admin/gamification", label: "Titles", desc: "Browse and award titles", icon: Crown },
  { to: "/app/admin/gamification", label: "Seasons", desc: "Manage monthly seasons", icon: CalendarRange },
];

function GamificationHub() {
  const { role } = useAuth();
  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Gamification</h1>
        <p className="text-sm text-muted-foreground">Talents, passes, spin, rewards, titles, seasons</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
