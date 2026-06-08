import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import {
  Users, BookOpen, FileText, ClipboardList, Megaphone, GraduationCap,
  Map, Swords, Trophy, ShoppingBag, Award, ChevronRight, Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { HeroCard } from "@/components/gamification/HeroCard";
import { DailyChestCard } from "@/components/gamification/DailyChestCard";
import { ActiveBonusesCard } from "@/components/gamification/ActiveBonusesCard";
import { getGamificationDashboard, dailyCheckIn } from "@/lib/api/gamification.functions";
import { getIcon } from "@/lib/gamification/icons";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold leading-tight">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { role, user } = useAuth();
  if (role === "admin") return <AdminDashboard />;
  if (role === "student") return <StudentDashboard userId={user?.id} />;
  return <p className="text-muted-foreground">Loading…</p>;
}

function AdminDashboard() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [students, active, lectures, notes, tests] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("lectures").select("id", { count: "exact", head: true }),
        supabase.from("notes").select("id", { count: "exact", head: true }),
        supabase.from("tests").select("id", { count: "exact", head: true }),
      ]);
      return {
        students: students.count ?? 0,
        active: active.count ?? 0,
        lectures: lectures.count ?? 0,
        notes: notes.count ?? 0,
        tests: tests.count ?? 0,
      };
    },
  });

  const announcements = useQuery({
    queryKey: ["recent-announcements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements").select("id, title, message, created_at")
        .order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage students, content, tests and announcements.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={Users} label="Total students" value={stats.data?.students ?? "—"} />
        <StatCard icon={GraduationCap} label="Active students" value={stats.data?.active ?? "—"} />
        <StatCard icon={BookOpen} label="Lectures" value={stats.data?.lectures ?? "—"} />
        <StatCard icon={FileText} label="Notes" value={stats.data?.notes ?? "—"} />
        <StatCard icon={ClipboardList} label="Tests" value={stats.data?.tests ?? "—"} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="h-5 w-5 text-primary" /> Recent announcements
          </CardTitle>
          <CardDescription>Latest updates from your academy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {announcements.data?.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
          {announcements.data?.map((a) => (
            <div key={a.id} className="border-l-4 border-primary pl-3 py-1">
              <div className="font-semibold text-sm">{a.title}</div>
              <div className="text-sm text-muted-foreground">{a.message}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(a.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

const QUICK_ACTIONS: { to: string; label: string; sub: string; icon: typeof Map; gradient: string }[] = [
  { to: "/app/worlds", label: "World Map", sub: "Explore worlds", icon: Map, gradient: "from-blue-500 to-indigo-600" },
  { to: "/app/tests", label: "Boss Battles", sub: "Fight bosses", icon: Swords, gradient: "from-rose-500 to-orange-500" },
  { to: "/app/leaderboard", label: "Rankings", sub: "Climb the ladder", icon: Trophy, gradient: "from-amber-400 to-yellow-600" },
  { to: "/app/shop", label: "Hero Shop", sub: "Spend coins", icon: ShoppingBag, gradient: "from-fuchsia-500 to-purple-600" },
  { to: "/app/achievements", label: "Badges", sub: "Collect them all", icon: Award, gradient: "from-emerald-400 to-teal-600" },
  { to: "/app/coins", label: "Treasury", sub: "Coin history", icon: Sparkles, gradient: "from-cyan-400 to-blue-500" },
  { to: "/app/talents", label: "Talents", sub: "Skill tree", icon: Sparkles, gradient: "from-violet-500 to-fuchsia-600" },
];

function StudentDashboard({ userId }: { userId?: string }) {
  const checkIn = useServerFn(dailyCheckIn);
  const getDash = useServerFn(getGamificationDashboard);

  useEffect(() => {
    if (!userId) return;
    checkIn().catch(() => {});
  }, [userId, checkIn]);

  const dash = useQuery({
    queryKey: ["gam-dashboard", userId],
    enabled: !!userId,
    queryFn: () => getDash(),
  });

  const profile = useQuery({
    queryKey: ["profile-cosmetics", userId],
    enabled: !!userId,
    queryFn: async () =>
      (await supabase
        .from("profiles")
        .select("name, equipped_avatar, equipped_frame, equipped_title")
        .eq("id", userId!)
        .maybeSingle()).data,
  });

  const announcements = useQuery({
    queryKey: ["recent-announcements-student"],
    queryFn: async () =>
      (await supabase.from("announcements").select("id, title, message, created_at").order("created_at", { ascending: false }).limit(3)).data ?? [],
  });

  const stats = dash.data?.stats;

  return (
    <div className="space-y-5">
      {stats && (
        <HeroCard
          name={profile.data?.name || "Hero"}
          xp={stats.xp}
          level={stats.level}
          coins={stats.coins}
          streak={stats.streak_days}
          avatar={profile.data?.equipped_avatar as string | null | undefined}
          frame={profile.data?.equipped_frame as string | null | undefined}
          title={profile.data?.equipped_title as string | null | undefined}
        />
      )}

      <ActiveBonusesCard />

      <DailyChestCard />

      {/* Continue Adventure / World map preview */}
      <Link to="/app/worlds" className="block">
        <motion.div
          whileTap={{ scale: 0.98 }}
          className="relative overflow-hidden rounded-2xl p-5 glass-card glow-primary"
        >
          <div className="absolute inset-0 opacity-50 pointer-events-none bg-[radial-gradient(circle_at_80%_30%,#22C55E_0%,transparent_55%)]" />
          <div className="relative flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-[image:var(--gradient-primary)] flex items-center justify-center text-3xl glow-primary">
              🗺️
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">Adventure</div>
              <div className="text-lg font-extrabold leading-tight">Continue your quest</div>
              <div className="text-xs text-muted-foreground">Enter the world map and conquer new realms</div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </motion.div>
      </Link>

      {/* Quick actions grid */}
      <div>
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground mb-2 px-1">
          Quick travel
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          {QUICK_ACTIONS.map((a, i) => {
            const Icon = a.icon;
            return (
              <motion.div
                key={a.to}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  to={a.to}
                  className="block rounded-2xl glass-card p-3 text-center hover:scale-[1.03] transition-transform"
                >
                  <div className={`mx-auto h-12 w-12 rounded-xl bg-gradient-to-br ${a.gradient} flex items-center justify-center shadow-lg`}>
                    <Icon className="h-6 w-6 text-white drop-shadow" />
                  </div>
                  <div className="mt-2 text-xs font-bold leading-tight">{a.label}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{a.sub}</div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* World progress */}
      {(dash.data?.subjectProgress ?? []).length > 0 && (
        <div className="rounded-2xl glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold flex items-center gap-2">
              <Map className="h-4 w-4 text-primary-glow" /> Your Worlds
            </h2>
            <Link to="/app/worlds" className="text-xs font-bold text-primary-glow">View all →</Link>
          </div>
          <div className="space-y-3">
            {dash.data?.subjectProgress.slice(0, 4).map((s) => {
              const pct = s.total > 0 ? Math.round((s.watched / s.total) * 100) : 0;
              return (
                <div key={s.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full bg-[image:var(--gradient-primary)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent badges */}
      {(dash.data?.recentAchievements ?? []).length > 0 && (
        <div className="rounded-2xl glass-card p-4">
          <h2 className="font-extrabold flex items-center gap-2 mb-3">
            <Award className="h-4 w-4 text-amber-300" /> Recent badges
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {dash.data?.recentAchievements.map((row, i) => {
              const a = (row as { achievement: { code: string; name: string; description: string; icon: string } }).achievement;
              const Icon = getIcon(a.icon);
              return (
                <motion.div
                  key={a.code}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl bg-white/5 border border-white/10 p-2.5 flex items-center gap-2"
                >
                  <div className="h-9 w-9 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{a.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{a.description}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {(announcements.data?.length ?? 0) > 0 && (
        <div className="rounded-2xl glass-card p-4">
          <h2 className="font-extrabold flex items-center gap-2 mb-2">
            <Megaphone className="h-4 w-4 text-primary-glow" /> News from the Kingdom
          </h2>
          <div className="space-y-2">
            {announcements.data?.map((a) => (
              <div key={a.id} className="border-l-4 border-primary-glow pl-3 py-1">
                <div className="font-bold text-sm">{a.title}</div>
                <div className="text-sm text-muted-foreground">{a.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
