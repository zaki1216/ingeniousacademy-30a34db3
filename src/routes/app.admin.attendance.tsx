import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, CalendarDays, History, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  getAttendanceForDate, markAttendance, getAttendanceHistory, resetAttendance,
} from "@/lib/api/attendance.functions";


export const Route = createFileRoute("/app/admin/attendance")({ component: Page });

function Page() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);

  const listFn = useServerFn(getAttendanceForDate);
  const markFn = useServerFn(markAttendance);
  const histFn = useServerFn(getAttendanceHistory);
  const resetFn = useServerFn(resetAttendance);


  const list = useQuery({
    queryKey: ["att-list", date],
    queryFn: () => listFn({ data: { date } }),
    enabled: role === "admin",
  });

  const hist = useQuery({
    queryKey: ["att-hist"],
    queryFn: () => histFn({ data: { days: 30 } }),
    enabled: role === "admin",
  });

  const stats = useMemo(() => {
    const s = list.data?.students ?? [];
    return {
      total: s.length,
      present: s.filter((x) => x.status === "present").length,
      absent: s.filter((x) => x.status === "absent").length,
      unmarked: s.filter((x) => x.status === null).length,
    };
  }, [list.data]);

  if (role !== "admin") {
    return <p className="text-sm text-muted-foreground">Admin only.</p>;
  }

  async function mark(studentId: string, status: "present" | "absent") {
    try {
      await markFn({ data: { studentId, date, status } });
      toast.success(`Marked ${status}`);
      qc.invalidateQueries({ queryKey: ["att-list", date] });
      qc.invalidateQueries({ queryKey: ["att-hist"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function reset(studentId?: string) {
    try {
      const res = await resetFn({ data: { date, ...(studentId ? { studentId } : {}) } });
      toast.success(`Reset ${res.cleared ?? 0} record${res.cleared === 1 ? "" : "s"} • coins reverted`);
      qc.invalidateQueries({ queryKey: ["att-list", date] });
      qc.invalidateQueries({ queryKey: ["att-hist"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }


  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" /> Attendance
        </h1>
        <p className="text-sm text-muted-foreground">
          Present = +2 coins • Absent = −1 coin
        </p>
      </div>

      <Tabs defaultValue="mark">
        <TabsList>
          <TabsTrigger value="mark">Mark</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="mark" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium">Date</label>
            <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="w-48" />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="ml-auto" disabled={stats.present + stats.absent === 0}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Reset day
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset attendance for {date}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This deletes all attendance records for this date and reverts the coins
                    given or deducted for every affected student.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => reset()}>Reset all</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>


          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Present" value={stats.present} tone="green" />
            <StatCard label="Absent" value={stats.absent} tone="red" />
            <StatCard label="Unmarked" value={stats.unmarked} tone="amber" />
          </div>

          <div className="space-y-2">
            {list.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {list.data?.students.length === 0 && (
              <p className="text-sm text-muted-foreground">No students found.</p>
            )}
            {list.data?.students.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                  </div>
                  {s.status && (
                    <Badge variant={s.status === "present" ? "default" : "destructive"}>
                      {s.status}
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant={s.status === "present" ? "default" : "outline"}
                    onClick={() => mark(s.id, "present")}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> P
                  </Button>
                  <Button
                    size="sm"
                    variant={s.status === "absent" ? "destructive" : "outline"}
                    onClick={() => mark(s.id, "absent")}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> A
                  </Button>
                  {s.status && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Reset this student's attendance for this date"
                      onClick={() => reset(s.id)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}

                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-2">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Last 30 days</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {hist.data?.rows.length === 0 && (
                  <p className="p-4 text-sm text-muted-foreground">No attendance recorded yet.</p>
                )}
                {hist.data?.rows.map((r) => (
                  <div key={r.id} className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.student?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.date}</div>
                    </div>
                    <Badge variant={r.status === "present" ? "default" : "destructive"}>
                      {r.status}
                    </Badge>
                    <span className={r.coins_delta >= 0 ? "text-green-600 font-bold text-sm" : "text-red-600 font-bold text-sm"}>
                      {r.coins_delta >= 0 ? "+" : ""}{r.coins_delta}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "green" | "red" | "amber" }) {
  const color =
    tone === "green" ? "text-green-600" :
    tone === "red" ? "text-red-600" :
    tone === "amber" ? "text-amber-600" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
