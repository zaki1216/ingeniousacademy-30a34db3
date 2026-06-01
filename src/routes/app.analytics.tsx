import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, Trophy, Target, ClipboardList } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";

export const Route = createFileRoute("/app/analytics")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AnalyticsPage,
});

type Row = {
  id: string;
  student_id: string;
  test_id: string;
  score: number;
  total_marks: number;
  percentage: number;
  attempt_date: string;
};

function AnalyticsPage() {
  const { role } = useAuth();
  const [studentId, setStudentId] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-admin"],
    enabled: role === "admin",
    queryFn: async () => {
      const [resultsRes, testsRes, studentsRes] = await Promise.all([
        supabase
          .from("results")
          .select("id, student_id, test_id, score, total_marks, percentage, attempt_date")
          .order("attempt_date", { ascending: true }),
        supabase.from("tests").select("id, title"),
        supabase.from("profiles").select("id, name, email"),
      ]);
      return {
        results: (resultsRes.data ?? []) as Row[],
        tests: testsRes.data ?? [],
        students: studentsRes.data ?? [],
      };
    },
  });

  if (role !== "admin") {
    return <div className="p-4 text-sm text-muted-foreground">Admins only.</div>;
  }

  const results = data?.results ?? [];
  const tests = data?.tests ?? [];
  const students = data?.students ?? [];

  const titleOf = (id: string) => tests.find((t) => t.id === id)?.title ?? "—";
  const nameOf = (id: string) => students.find((s) => s.id === id)?.name ?? "—";

  const filtered = useMemo(
    () => (studentId === "all" ? results : results.filter((r) => r.student_id === studentId)),
    [results, studentId],
  );

  // Per-student aggregate (used when "all" selected)
  const perStudent = useMemo(() => {
    const map = new Map<string, { attempts: number; sumPct: number; best: number }>();
    for (const r of results) {
      const cur = map.get(r.student_id) ?? { attempts: 0, sumPct: 0, best: 0 };
      cur.attempts += 1;
      cur.sumPct += Number(r.percentage);
      cur.best = Math.max(cur.best, Number(r.percentage));
      map.set(r.student_id, cur);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({
        id,
        name: nameOf(id),
        attempts: v.attempts,
        avg: +(v.sumPct / v.attempts).toFixed(1),
        best: +v.best.toFixed(1),
      }))
      .sort((a, b) => b.avg - a.avg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, students]);

  // Per-test average across attempts (uses filtered)
  const perTest = useMemo(() => {
    const map = new Map<string, { sum: number; n: number }>();
    for (const r of filtered) {
      const cur = map.get(r.test_id) ?? { sum: 0, n: 0 };
      cur.sum += Number(r.percentage);
      cur.n += 1;
      map.set(r.test_id, cur);
    }
    return Array.from(map.entries()).map(([id, v]) => ({
      test: titleOf(id),
      avg: +(v.sum / v.n).toFixed(1),
      attempts: v.n,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, tests]);

  // Progress over time
  const progress = useMemo(
    () =>
      filtered.map((r) => ({
        date: new Date(r.attempt_date).toLocaleDateString(),
        percentage: Number(r.percentage),
        test: titleOf(r.test_id),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, tests],
  );

  const summary = useMemo(() => {
    const attempts = filtered.length;
    const avg = attempts ? filtered.reduce((s, r) => s + Number(r.percentage), 0) / attempts : 0;
    const best = attempts ? Math.max(...filtered.map((r) => Number(r.percentage))) : 0;
    const passed = filtered.filter((r) => Number(r.percentage) >= 40).length;
    return {
      attempts,
      avg: +avg.toFixed(1),
      best: +best.toFixed(1),
      passRate: attempts ? +((passed / attempts) * 100).toFixed(1) : 0,
    };
  }, [filtered]);

  const barColor = (v: number) =>
    v >= 75 ? "hsl(var(--primary))" : v >= 40 ? "hsl(var(--muted-foreground))" : "hsl(var(--destructive))";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Student Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Performance overview across tests and over time
          </p>
        </div>
        <Select value={studentId} onValueChange={setStudentId}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="All students" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All students</SelectItem>
            {students
              .slice()
              .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
              .map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading analytics…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={ClipboardList} label="Attempts" value={summary.attempts} />
            <StatCard icon={Target} label="Avg %" value={`${summary.avg}%`} />
            <StatCard icon={Trophy} label="Best %" value={`${summary.best}%`} />
            <StatCard icon={TrendingUp} label="Pass rate" value={`${summary.passRate}%`} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test-wise average score</CardTitle>
            </CardHeader>
            <CardContent>
              {perTest.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attempts yet.</p>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer>
                    <BarChart data={perTest} margin={{ left: -10, right: 8, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="test" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => [`${v}%`, "Avg"]}
                      />
                      <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                        {perTest.map((d, i) => (
                          <Cell key={i} fill={barColor(d.avg)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress over time</CardTitle>
            </CardHeader>
            <CardContent>
              {progress.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attempts yet.</p>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer>
                    <LineChart data={progress} margin={{ left: -10, right: 8, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line
                        type="monotone"
                        dataKey="percentage"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {studentId === "all" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Student leaderboard</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead className="text-right">Attempts</TableHead>
                      <TableHead className="text-right">Avg %</TableHead>
                      <TableHead className="text-right">Best %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perStudent.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                          No data
                        </TableCell>
                      </TableRow>
                    ) : (
                      perStudent.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-right">{s.attempts}</TableCell>
                          <TableCell className="text-right">{s.avg}%</TableCell>
                          <TableCell className="text-right">{s.best}%</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {studentId === "all" ? "Recent attempts" : `Attempts — ${nameOf(studentId)}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    {studentId === "all" && <TableHead>Student</TableHead>}
                    <TableHead>Test</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={studentId === "all" ? 5 : 4} className="text-center text-sm text-muted-foreground">
                        No attempts
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered
                      .slice()
                      .reverse()
                      .map((r) => {
                        const pct = Number(r.percentage);
                        const variant: "default" | "secondary" | "destructive" =
                          pct >= 75 ? "default" : pct >= 40 ? "secondary" : "destructive";
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs">{new Date(r.attempt_date).toLocaleDateString()}</TableCell>
                            {studentId === "all" && <TableCell>{nameOf(r.student_id)}</TableCell>}
                            <TableCell>{titleOf(r.test_id)}</TableCell>
                            <TableCell className="text-right">
                              {r.score}/{r.total_marks}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={variant}>{pct.toFixed(1)}%</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
