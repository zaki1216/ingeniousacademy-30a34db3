import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, CheckCircle2, XCircle, Flame, Trophy } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMyAttendance } from "@/lib/api/attendance.functions";

export const Route = createFileRoute("/app/attendance")({ component: Page });

function Page() {
  const fn = useServerFn(getMyAttendance);
  const q = useQuery({ queryKey: ["my-attendance"], queryFn: () => fn() });

  const rows = q.data?.rows ?? [];
  const present = rows.filter((r) => r.status === "present").length;
  const absent = rows.filter((r) => r.status === "absent").length;
  const net = rows.reduce((s, r) => s + r.coins_delta, 0);

  // Streaks: rows come newest-first. Current = consecutive "present" from latest record. Best = longest run of "present".
  const ordered = [...rows].sort((a, b) => a.date.localeCompare(b.date)); // oldest -> newest
  let best = 0;
  let run = 0;
  for (const r of ordered) {
    if (r.status === "present") { run++; if (run > best) best = run; }
    else run = 0;
  }
  let current = 0;
  for (const r of rows) { // newest-first
    if (r.status === "present") current++;
    else break;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" /> My Attendance
        </h1>
        <p className="text-sm text-muted-foreground">Your attendance history, streaks & coin impact</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center shadow">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Current streak</div>
              <div className="text-2xl font-extrabold">{current} <span className="text-xs text-muted-foreground font-semibold">day{current === 1 ? "" : "s"}</span></div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white flex items-center justify-center shadow">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Best streak</div>
              <div className="text-2xl font-extrabold">{best} <span className="text-xs text-muted-foreground font-semibold">day{best === 1 ? "" : "s"}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <div className="text-xs uppercase text-muted-foreground">Present</div>
          <div className="text-2xl font-extrabold text-green-600">{present}</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="text-xs uppercase text-muted-foreground">Absent</div>
          <div className="text-2xl font-extrabold text-red-600">{absent}</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="text-xs uppercase text-muted-foreground">Net coins</div>
          <div className={`text-2xl font-extrabold ${net >= 0 ? "text-amber-500" : "text-red-600"}`}>
            {net >= 0 ? "+" : ""}{net}
          </div>
        </CardContent></Card>
      </div>

      <div className="space-y-2">
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No attendance recorded yet.</p>
        )}
        {rows.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                r.status === "present" ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600"
              }`}>
                {r.status === "present" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{new Date(r.date).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</div>
                <Badge variant={r.status === "present" ? "default" : "destructive"} className="mt-1">{r.status}</Badge>
              </div>
              <div className={r.coins_delta >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                {r.coins_delta >= 0 ? "+" : ""}{r.coins_delta}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
