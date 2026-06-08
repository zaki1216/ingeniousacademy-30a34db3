import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { Users, BookOpen, FileText, ClipboardList, Megaphone, GraduationCap, Award, Trophy } from "lucide-react";
import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { GameStatsCard } from "@/components/gamification/GameStatsCard";
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
    queryKey: ["profile-name", userId],
    enabled: !!userId,
    queryFn: async () => (await supabase.from("profiles").select("name").eq("id", userId!).maybeSingle()).data,
  });

  const announcements = useQuery({
    queryKey: ["recent-announcements-student"],
    queryFn: async () =>
      (await supabase.from("announcements").select("id, title, message, created_at").order("created_at", { ascending: false }).limit(3)).data ?? [],
  });

  const stats = dash.data?.stats;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          Welcome{profile.data?.name ? `, ${profile.data.name}` : ""} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Learn. Level up. Earn rewards.</p>
      </div>

      {stats && (
        <GameStatsCard
          xp={stats.xp}
          level={stats.level}
          coins={stats.coins}
          streak={stats.streak_days}
          maxStreak={stats.max_streak}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button asChild variant="outline" className="h-auto py-3 justify-start">
          <Link to="/app/leaderboard">
            <Trophy className="h-4 w-4 mr-2 text-primary" />
            <span className="text-left">
              <span className="block font-semibold">Leaderboard</span>
              <span className="block text-xs text-muted-foreground">Compete with classmates</span>
            </span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-3 justify-start">
          <Link to="/app/achievements">
            <Award className="h-4 w-4 mr-2 text-primary" />
            <span className="text-left">
              <span className="block font-semibold">Achievements</span>
              <span className="block text-xs text-muted-foreground">Unlock badges</span>
            </span>
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent badges</CardTitle>
        </CardHeader>
        <CardContent>
          {(dash.data?.recentAchievements ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No badges unlocked yet. Complete a lecture or quiz to earn your first!</p>
          ) : (
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
                    className="rounded-lg border p-2.5 flex items-center gap-2"
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{a.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{a.description}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Subject progress</CardTitle>
          <CardDescription>Lectures watched per subject</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(dash.data?.subjectProgress ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No subjects yet.</p>
          )}
          {dash.data?.subjectProgress.map((s) => {
            const pct = s.total > 0 ? Math.round((s.watched / s.total) * 100) : 0;
            return (
              <div key={s.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground">{s.watched} / {s.total}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-[image:var(--gradient-primary)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {(announcements.data?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" /> Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {announcements.data?.map((a) => (
              <div key={a.id} className="border-l-4 border-primary pl-3 py-1">
                <div className="font-semibold text-sm">{a.title}</div>
                <div className="text-sm text-muted-foreground">{a.message}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
