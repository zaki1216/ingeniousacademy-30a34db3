import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  Users, BookOpen, ClipboardList, TrendingUp, CalendarCheck, Award, Download, Search,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { adminGetOverview, adminGetStudentReportCard } from "@/lib/api/admin-analytics.functions";
import { adminListStudentsForViews } from "@/lib/api/lecture-views.functions";

export const Route = createFileRoute("/app/admin/dashboard")({ component: AdminDashboard });

function AdminDashboard() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Class-wide analytics and student report cards</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Report Cards</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <Overview />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <Reports />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
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
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard icon={Users} label="Students" value={t.totalStudents} sub={`${t.activeStudents} active`} />
        <StatCard icon={TrendingUp} label="Avg Score" value={`${t.overallAvg}%`} sub={`${t.totalAttempts} attempts`} />
        <StatCard icon={CalendarCheck} label="Attendance" value={`${t.attendanceRate}%`} />
        <StatCard icon={BookOpen} label="Library" value={t.totalLectures} sub={`${t.totalTests} tests`} />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" />Test performance</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.testStats.length === 0 && <p className="text-sm text-muted-foreground">No attempts yet.</p>}
            {data.testStats.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm gap-2">
                <div className="min-w-0 truncate">{t.title}</div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{t.attempts}x</span>
                  <Badge variant={t.avg_percentage >= 75 ? "default" : t.avg_percentage >= 40 ? "secondary" : "destructive"}>{t.avg_percentage}%</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" />Most-watched lectures</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.topLectures.length === 0 && <p className="text-sm text-muted-foreground">No views yet.</p>}
            {data.topLectures.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm gap-2">
                <div className="min-w-0">
                  <div className="truncate">{l.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{l.chapter}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold">{l.totalWatches}</div>
                  <div className="text-[11px] text-muted-foreground">{l.viewers} viewers</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" />Hardest questions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.hardestQuestions.length === 0 && <p className="text-sm text-muted-foreground">Not enough data.</p>}
          {data.hardestQuestions.map((q) => (
            <div key={q.id} className="flex items-start justify-between gap-2 text-sm border-b last:border-0 pb-2 last:pb-0">
              <div className="min-w-0">
                <div className="truncate">{q.question_text}</div>
                <div className="text-[11px] text-muted-foreground">{q.test_title} · {q.attempts} attempts</div>
              </div>
              <Badge variant={q.correct_pct < 40 ? "destructive" : "secondary"} className="shrink-0">{q.correct_pct}% correct</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Reports() {
  const listFn = useServerFn(adminListStudentsForViews);
  const cardFn = useServerFn(adminGetStudentReportCard);
  const [studentId, setStudentId] = useState<string>("");
  const [search, setSearch] = useState("");

  const students = useQuery({ queryKey: ["admin-students-list"], queryFn: () => listFn() });
  const filtered = useMemo(() => {
    const s = (students.data?.students ?? []) as { id: string; name: string | null; email: string | null }[];
    const q = search.trim().toLowerCase();
    if (!q) return s;
    return s.filter((x) => (x.name ?? "").toLowerCase().includes(q) || (x.email ?? "").toLowerCase().includes(q));
  }, [students.data, search]);

  const card = useQuery({
    queryKey: ["admin-report-card", studentId],
    enabled: !!studentId,
    queryFn: () => cardFn({ data: { studentId } }),
  });

  function exportCsv() {
    if (!card.data) return;
    const { profile, attendance, tests, lectures, stats, weakChapters } = card.data;
    const lines: string[] = [];
    lines.push("Report Card");
    lines.push(`Name,${profile?.name ?? ""}`);
    lines.push(`Email,${profile?.email ?? ""}`);
    lines.push(`Phone,${profile?.phone ?? ""}`);
    lines.push("");
    lines.push("Summary");
    lines.push(`Test Average,${tests.average}%`);
    lines.push(`Tests Attempted,${tests.count}`);
    lines.push(`Attendance,${attendance.present}/${attendance.total} (${attendance.percentage}%)`);
    lines.push(`Lectures Watched,${lectures.unique}`);
    lines.push(`Total Re-watches,${lectures.totalWatches}`);
    lines.push(`XP,${stats?.xp ?? 0}`);
    lines.push(`Coins,${stats?.coins ?? 0}`);
    lines.push(`Level,${stats?.level ?? 1}`);
    lines.push(`Streak,${stats?.streak_days ?? 0}`);
    lines.push("");
    lines.push("Weak Chapters (avg < 50%)");
    lines.push("Subject,Chapter,Avg %,Attempts");
    for (const w of weakChapters) lines.push(`${w.subject},${w.name},${w.avg},${w.attempts}`);
    lines.push("");
    lines.push("Test Attempts");
    lines.push("Date,Test,Subject,Chapter,Score,Total,Percentage");
    for (const r of tests.rows) {
      lines.push([
        new Date(r.attempt_date).toLocaleString(),
        `"${(r.test_title ?? "").replace(/"/g, '""')}"`,
        r.subject, r.chapter, r.score, r.total, r.percentage,
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${profile?.name ?? "student"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-[1fr_auto] gap-2 items-end">
        <div>
          <label className="text-xs text-muted-foreground">Select student</label>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger><SelectValue placeholder="Pick a student" /></SelectTrigger>
            <SelectContent>
              <div className="p-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                  <Input className="pl-7 h-8" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
              {filtered.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name ?? "—"} · {s.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={exportCsv} disabled={!card.data} variant="outline">
          <Download className="h-4 w-4 mr-2" />Export CSV
        </Button>
      </div>

      {!studentId && <p className="text-sm text-muted-foreground">Pick a student to see their report card.</p>}

      {card.isLoading && <Skeleton className="h-40" />}
      {card.data && (
        <div className="space-y-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-lg font-bold">{card.data.profile?.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{card.data.profile?.email}</div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">Lv {card.data.stats?.level ?? 1}</Badge>
                  <Badge variant="secondary">{card.data.stats?.xp ?? 0} XP</Badge>
                  <Badge variant="secondary">{card.data.stats?.coins ?? 0} coins</Badge>
                  <Badge variant="secondary">🔥 {card.data.stats?.streak_days ?? 0}d</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard icon={TrendingUp} label="Test Avg" value={`${card.data.tests.average}%`} sub={`${card.data.tests.count} attempts`} />
            <StatCard icon={CalendarCheck} label="Attendance" value={`${card.data.attendance.percentage}%`} sub={`${card.data.attendance.present}/${card.data.attendance.total}`} />
            <StatCard icon={BookOpen} label="Lectures" value={card.data.lectures.unique} sub={`${card.data.lectures.totalWatches} watches`} />
            <StatCard icon={Award} label="Weak chapters" value={card.data.weakChapters.length} />
          </div>

          {card.data.weakChapters.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Weak chapters</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {card.data.weakChapters.map((w) => (
                  <div key={w.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0 truncate">{w.subject} · {w.name}</div>
                    <Badge variant="destructive" className="shrink-0">{w.avg}% ({w.attempts}x)</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Recent attempts</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {card.data.tests.rows.length === 0 && <p className="text-sm text-muted-foreground">No attempts yet.</p>}
              {card.data.tests.rows.slice(0, 20).map((r) => (
                <div key={r.result_id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate">{r.test_title}</div>
                    <div className="text-[11px] text-muted-foreground">{new Date(r.attempt_date).toLocaleString()} · {r.subject} · {r.chapter}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={r.percentage >= 75 ? "default" : r.percentage >= 40 ? "secondary" : "destructive"}>{r.percentage}%</Badge>
                    <div className="text-[11px] text-muted-foreground">{r.score}/{r.total}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
