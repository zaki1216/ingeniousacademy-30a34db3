import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles, Ticket, Gift, Award, Crown, CalendarRange, ShoppingBag,
  Coins, Zap, Ghost, Megaphone, Gamepad2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";
import { HeadmasterHeader } from "@/components/admin/HeadmasterHeader";

export const Route = createFileRoute("/app/admin/gamification")({
  head: () => ({ meta: [{ title: "Academy Systems — Academy Office" }] }),
  component: SystemsHub,
});

const tiles = [
  { to: "/app/admin/talents", label: "Coins & XP Rules", desc: "Talent tiers, multipliers, rewards", icon: Coins },
  { to: "/app/admin/passes", label: "Passes", desc: "Grant, revoke, approve requests", icon: Ticket },
  { to: "/app/admin/spin", label: "Spin Wheel", desc: "Prize weights & daily rewards", icon: Gift },
  { to: "/app/shop", label: "Merchant's Emporium", desc: "Preview and curate shop wares", icon: ShoppingBag },
  { to: "/app/collection", label: "Titles & Badges", desc: "Every honour a Cadet can earn", icon: Crown },
  { to: "/app/pets", label: "Shadows & Pets", desc: "Companions of the Academy", icon: Ghost },
  { to: "/app/admin/talents", label: "Season Rewards", desc: "Season pass tiers & seasonal loot", icon: CalendarRange },
  { to: "/app/admin/lumi", label: "Lumi Manager", desc: "Edit the Academy Spirit's dialogue", icon: Sparkles },
  { to: "/app/announcements", label: "Announcements", desc: "General · Events · Season · Urgent", icon: Megaphone },
  { to: "/app/admin/attendance", label: "Attendance Rewards", desc: "Streak coins & bonuses", icon: Zap },
  { to: "/app/collection", label: "Achievements", desc: "Milestone catalogue", icon: Award },
];

function SystemsHub() {
  const { role } = useAuth();
  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;
  return (
    <div className="space-y-5">
      <HeadmasterHeader
        icon={<Gamepad2 className="h-7 w-7" />}
        title="Academy Systems"
        tagline="The living machinery — coins, XP, passes, spins, shadows, seasons and the Spirit itself."
        lumi="Every reward Cadets chase is tuned from this room. Adjust with care — a coin doubled here echoes across every dungeon."
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map((t, i) => {
          const Icon = t.icon;
          return (
            <Link key={i} to={t.to}>
              <Card className="hover:border-amber-500/50 transition group h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-500/20 transition">
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
