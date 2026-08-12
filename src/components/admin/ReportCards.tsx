import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { TrendingUp, CalendarCheck, BookOpen, Award, Download, Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { adminGetStudentReportCard } from "@/lib/api/admin-analytics.functions";
import { adminListStudentsForViews } from "@/lib/api/lecture-views.functions";

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

export function ReportCards() {
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
    lines.push("Offline Test Results");
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
          <label className="text-xs text-muted-foreground">Select Cadet</label>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger><SelectValue placeholder="Pick a Cadet" /></SelectTrigger>
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

      {!studentId && <p className="text-sm text-muted-foreground">Pick a Cadet to see their Report Card.</p>}

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
            <StatCard icon={TrendingUp} label="Offline Test Avg" value={`${card.data.tests.average}%`} sub={`${card.data.tests.count} attempts`} />
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
