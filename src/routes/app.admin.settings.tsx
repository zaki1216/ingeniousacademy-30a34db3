import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Megaphone, Settings as SettingsIcon, Newspaper, GraduationCap, BookOpen,
  CalendarRange, Trophy, Coins, Zap, Ticket, ClipboardList, Cog,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/AuthContext";
import { HeadmasterHeader } from "@/components/admin/HeadmasterHeader";

export const Route = createFileRoute("/app/admin/settings")({
  head: () => ({ meta: [{ title: "Academy Settings — Academy Office" }] }),
  component: SettingsHub,
});

type Tile = { to?: string; label: string; desc: string; icon: any; readOnly?: boolean };

const groups: { title: string; tiles: Tile[] }[] = [
  {
    title: "Structure",
    tiles: [
      { to: "/app/settings", label: "Classes & Divisions", desc: "Cadet standards & divisions", icon: GraduationCap },
      { to: "/app/admin/content", label: "Subjects", desc: "Worlds of the Academy", icon: BookOpen },
      { to: "/app/settings", label: "Academic Year", desc: "Current session settings", icon: CalendarRange },
    ],
  },
  {
    title: "Ranks & Progression",
    tiles: [
      { label: "Hunter Ranks", desc: "E → Monarch tier thresholds", icon: Trophy, readOnly: true },
      { to: "/app/admin/talents", label: "XP Rules", desc: "How much XP each action awards", icon: Zap },
      { to: "/app/admin/talents", label: "Coin Rules", desc: "Coin rewards & multipliers", icon: Coins },
    ],
  },
  {
    title: "Rules",
    tiles: [
      { to: "/app/admin/passes", label: "Pass Rules", desc: "Pass types & approval flow", icon: Ticket },
      { to: "/app/admin/lecture-quizzes", label: "Quiz Rules", desc: "Pass mark & unlock gating", icon: ClipboardList },
      { to: "/app/admin/talents", label: "Season Settings", desc: "Season length & rewards", icon: CalendarRange },
    ],
  },
  {
    title: "Communication",
    tiles: [
      { to: "/app/announcements", label: "Announcements", desc: "Post to every Cadet", icon: Megaphone },
      { to: "/app/announcements", label: "News", desc: "Recent posts archive", icon: Newspaper },
      { to: "/app/settings", label: "System Preferences", desc: "Account & interface", icon: SettingsIcon },
    ],
  },
];

function SettingsHub() {
  const { role } = useAuth();
  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;
  return (
    <div className="space-y-5">
      <HeadmasterHeader
        icon={<Cog className="h-7 w-7" />}
        title="Academy Settings"
        tagline="Every rule, ceremony and clockwork gear of Ingenious Academy."
        lumi="Change a rule here and every classroom, arena and dungeon adapts. Read-only tiles show live values that live inside the game code."
      />
      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="mb-2 text-xs font-orbitron uppercase tracking-widest text-amber-300/80">{g.title}</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {g.tiles.map((t, i) => {
                const Icon = t.icon;
                const Inner = (
                  <Card className="hover:border-amber-500/50 transition group h-full">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-500/20 transition">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold flex items-center gap-1.5">
                          {t.label}
                          {t.readOnly && <Badge variant="outline" className="text-[9px]">Read-only</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">{t.desc}</div>
                      </div>
                    </CardContent>
                  </Card>
                );
                return t.to ? (
                  <Link key={i} to={t.to}>{Inner}</Link>
                ) : (
                  <div key={i} className="cursor-not-allowed opacity-70">{Inner}</div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
