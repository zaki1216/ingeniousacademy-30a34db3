import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users, BookOpen, TrendingUp, CalendarCheck, UserPlus,
  ClipboardEdit, Plus, LayoutDashboard, AlertTriangle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HeadmasterHeader } from "@/components/admin/HeadmasterHeader";
import { adminGetOverview } from "@/lib/api/admin-analytics.functions";

export const Route = createFileRoute("/app/admin/dashboard")({
  head: () => ({ meta: [{ title: "Command Center — Academy Office" }] }),
  component: CommandCenter,
});

const QUICK_ACTIONS: { to: string; label: string; icon: any }[] = [
  { to: "/app/admin/students", label: "Add Student", icon: UserPlus },
  { to: "/app/admin/attendance", label: "Mark Attendance", icon: CalendarCheck },
  { to: "/app/content", label: "Add Course", icon: Plus },
  { to: "/app/admin/offline-tests", label: "Record Test", icon: ClipboardEdit },
];

function CommandCenter() {
  return (
    <div className="space-y-5">
      <HeadmasterHeader
        icon={<LayoutDashboard className="h-7 w-7" />}
        title="Command Center"
        tagline="What needs your attention today."
        lumi="This is your Headmaster's desk — a quick pulse of the Academy, and the actions you use most."
      />

      <div>
        <div className="mb-2 text-xs font-orbitron uppercase tracking-widest text-amber-300/80">
          Quick Actions
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.label} to={a.to}>
                <Card className="hover:border-amber-500/50 transition group h-full">
                  <CardContent className="p-3 flex flex-col items-center gap-1 text-center">
                    <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-500/20 transition">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-[11px] font-semibold leading-tight">{a.label}</div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <Overview />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-bold leading-tight">{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function Overview() {
  const fn = useServerFn(adminGetOverview);
  const { data, isLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: () => fn() });

  if (isLoading || !data) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  }

  const t = data.totals;
  const inactive = Math.max(0, t.totalStudents - t.activeStudents);
  const pending: { label: string; to: string }[] = [];
  if (inactive > 0) pending.push({ label: `${inactive} inactive student account${inactive > 1 ? "s" : ""}`, to: "/app/admin/students" });
  if (t.attendanceRate === 0) pending.push({ label: "Attendance not marked today", to: "/app/admin/attendance" });
  if (t.totalLectures === 0) pending.push({ label: "No lectures published yet", to: "/app/content" });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard icon={Users} label="Active Students" value={t.activeStudents} sub={`of ${t.totalStudents} enrolled`} />
        <StatCard icon={CalendarCheck} label="Today's Attendance" value={`${t.attendanceRate}%`} sub="Today's roll" />
        <StatCard icon={BookOpen} label="Learning Activity" value={t.totalLectures} sub="lectures available" />
        <StatCard icon={TrendingUp} label="Assessments" value={t.totalTests} sub={`${t.totalAttempts} attempts`} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />Pending Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pending.length === 0 && <p className="text-sm text-muted-foreground">Nothing needs your attention right now.</p>}
          {pending.map((p) => (
            <Link key={p.label} to={p.to} className="flex items-center justify-between text-sm hover:text-amber-400 transition gap-2">
              <span className="min-w-0 truncate">{p.label}</span>
              <span className="text-xs shrink-0">Open →</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
