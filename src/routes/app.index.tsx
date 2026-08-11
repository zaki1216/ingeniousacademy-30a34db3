import { AcademyPageSkeleton } from "@/components/academy/AcademyStates";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import {
  Users, BookOpen, ClipboardList, Megaphone, Target,
} from "lucide-react";
import { AcademyWorld } from "@/components/campus/AcademyWorld";
import { ContinueLearningCard } from "@/components/learning/ContinueLearningCard";
import { DailyMissions } from "@/components/learning/DailyMissions";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { dailyCheckIn } from "@/lib/api/gamification.functions";
import { adminGetCommandCenterOverview } from "@/lib/api/admin-rewards.functions";

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
  return <AcademyPageSkeleton />;
}

function AdminDashboard() {
  return <AcademyCommandCenter />;
}


function StudentDashboard({ userId }: { userId?: string }) {
  const navigate = useNavigate();
  const checkIn = useServerFn(dailyCheckIn);

  useEffect(() => {
    if (!userId) return;
    checkIn({ data: {} }).catch(() => {});
  }, [userId, checkIn]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("campusIntroSeen") !== "1") {
        navigate({ to: "/app/welcome" });
      }
    } catch {
      // ignore
    }
  }, [navigate]);

  return (
    <div className="space-y-3">
      <ContinueLearningCard variant="hero" />
      <DailyMissions />
      <AcademyWorld />
    </div>
  );
}

function AcademyCommandCenter() {
  const fn = useServerFnSafe();
  const overview = fn.data;
  const stats = useQuery({
    queryKey: ["admin-cc-stats"],
    queryFn: async () => {
      const [students, active] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);
      return { students: students.count ?? 0, active: active.count ?? 0 };
    },
  });

  const announcements = useQuery({
    queryKey: ["recent-announcements"],
    queryFn: async () =>
      (await supabase.from("announcements").select("id, title, message, created_at").order("created_at", { ascending: false }).limit(3)).data ?? [],
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Academy Command Center</h1>
        <p className="text-muted-foreground text-sm mt-1">Live operations & quick controls</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Students" value={stats.data?.students ?? "—"} />
        <StatCard icon={Users} label="Active" value={stats.data?.active ?? "—"} />
        <StatCard
          icon={Target}
          label="Today's Attendance"
          value={overview ? `${overview.attendance.present}/${overview.attendance.total}` : "—"}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Quick Actions</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Link to="/app/admin/students" className="rounded-xl border border-white/10 p-3 hover:border-primary/50 text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" />Student Management</Link>
          <Link to="/app/content" className="rounded-xl border border-white/10 p-3 hover:border-primary/50 text-sm font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4" />Content</Link>
          <Link to="/app/admin/progress" className="rounded-xl border border-white/10 p-3 hover:border-primary/50 text-sm font-semibold flex items-center gap-2"><ClipboardList className="h-4 w-4" />Progress</Link>
          <Link to="/app/admin/lumi" className="rounded-xl border border-white/10 p-3 hover:border-primary/50 text-sm font-semibold flex items-center gap-2"><Megaphone className="h-4 w-4" />Announce</Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Pending Pass Requests</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {!overview?.pendingPasses.length && <p className="text-sm text-muted-foreground">No pending requests.</p>}
            {overview?.pendingPasses.slice(0, 6).map((p: any) => (
              <div key={p.id} className="text-sm flex items-center justify-between gap-2">
                <span className="truncate">{(p.profiles?.name ?? "Student")} · {p.pass_code}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top Students</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {!overview?.topStudents.length && (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
            {overview?.topStudents.map((s: any, i: number) => (
              <div key={s.user_id} className="text-sm flex items-center justify-between">
                <span className="truncate">{i + 1}. {s.profiles?.name ?? "—"}</span>
                <span className="text-xs text-muted-foreground">Lv {s.level} · {s.xp} XP</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Recent Activity (24h)</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 max-h-56 overflow-y-auto">
            {!overview?.recentActivity.length && <p className="text-sm text-muted-foreground">Quiet day.</p>}
            {overview?.recentActivity.map((a: any, i: number) => (
              <div key={i} className="text-xs flex items-center justify-between">
                <span className="truncate">{a.profiles?.name ?? "Student"} · {a.reason}</span>
                <span className="text-muted-foreground">+{a.amount} XP</span>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>

      {announcements.data && announcements.data.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4" />Recent announcements</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {announcements.data.map((a) => (
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

function useServerFnSafe() {
  const getCC = useServerFn(adminGetCommandCenterOverview);
  return useQuery({ queryKey: ["admin-cc-overview"], queryFn: () => getCC() });
}
