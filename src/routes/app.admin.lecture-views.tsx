import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { PlayCircle, Users, Eye, Search, ArrowLeft, User as UserIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  adminListLectureViewStats,
  adminGetLectureWatchers,
  adminListStudentsForViews,
  adminGetStudentWatchHistory,
} from "@/lib/api/lecture-views.functions";

export const Route = createFileRoute("/app/admin/lecture-views")({ component: Page });

function Page() {
  const { role } = useAuth();
  if (role !== "admin") return <p className="text-sm text-muted-foreground">Admin only.</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Eye className="h-6 w-6 text-primary" /> Lecture Views
        </h1>
        <p className="text-sm text-muted-foreground">
          Track which students watched which lectures and how many times.
        </p>
      </div>

      <Tabs defaultValue="by-lecture">
        <TabsList>
          <TabsTrigger value="by-lecture">By Lecture</TabsTrigger>
          <TabsTrigger value="by-student">By Student</TabsTrigger>
        </TabsList>
        <TabsContent value="by-lecture"><ByLecture /></TabsContent>
        <TabsContent value="by-student"><ByStudent /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- By Lecture ---------------- */

function ByLecture() {
  const listFn = useServerFn(adminListLectureViewStats);
  const watchersFn = useServerFn(adminGetLectureWatchers);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ id: string; title: string } | null>(null);

  const list = useQuery({ queryKey: ["adm-lec-views"], queryFn: () => listFn() });
  const watchers = useQuery({
    queryKey: ["adm-lec-watchers", selected?.id],
    enabled: !!selected,
    queryFn: () => watchersFn({ data: { lectureId: selected!.id } }),
  });

  const filtered = useMemo(() => {
    const rows = list.data?.rows ?? [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.lecture_title.toLowerCase().includes(q) ||
        r.chapter_name?.toLowerCase().includes(q) ||
        r.subject_name?.toLowerCase().includes(q),
    );
  }, [list.data, search]);

  if (selected) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to lectures
        </Button>
        <Card>
          <CardContent className="p-3">
            <div className="font-semibold">{selected.title}</div>
            <div className="text-xs text-muted-foreground">
              {watchers.data?.rows.length ?? 0} student{(watchers.data?.rows.length ?? 0) === 1 ? "" : "s"} watched
            </div>
          </CardContent>
        </Card>

        {watchers.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {watchers.data?.rows.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No one has watched this lecture yet.</p>
        )}
        <div className="space-y-2">
          {watchers.data?.rows.map((r) => (
            <Card key={r.user_id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Last watched {new Date(r.last_watched_at).toLocaleString()}
                  </div>
                </div>
                <Badge variant="default" className="shrink-0">
                  {r.watch_count}× watched
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search lectures, chapters, subjects…"
          className="pl-9"
        />
      </div>

      {list.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {filtered.length === 0 && !list.isLoading && (
        <p className="text-sm text-muted-foreground text-center py-6">No lectures found.</p>
      )}
      <div className="space-y-2">
        {filtered.map((l) => (
          <Card
            key={l.id}
            className="cursor-pointer hover:bg-accent/30 transition"
            onClick={() => setSelected({ id: l.id, title: l.lecture_title })}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <PlayCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">
                  L {l.lecture_number}. {l.lecture_title}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {l.subject_name ?? "—"}
                  {l.chapter_name ? ` · Ch ${l.chapter_number}. ${l.chapter_name}` : ""}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <Users className="h-3.5 w-3.5" /> {l.viewers}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {l.totalWatches} watch{l.totalWatches === 1 ? "" : "es"}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------------- By Student ---------------- */

function ByStudent() {
  const studentsFn = useServerFn(adminListStudentsForViews);
  const histFn = useServerFn(adminGetStudentWatchHistory);
  const [studentId, setStudentId] = useState<string>("");

  const students = useQuery({ queryKey: ["adm-lv-students"], queryFn: () => studentsFn() });
  const hist = useQuery({
    queryKey: ["adm-lv-student-hist", studentId],
    enabled: !!studentId,
    queryFn: () => histFn({ data: { studentId } }),
  });

  const totalWatches = (hist.data?.rows ?? []).reduce((s, r) => s + r.watch_count, 0);

  return (
    <div className="space-y-3">
      <Select value={studentId} onValueChange={setStudentId}>
        <SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger>
        <SelectContent>
          {students.data?.students.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name ?? s.email ?? s.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {studentId && (
        <div className="grid grid-cols-2 gap-3">
          <Card><CardContent className="p-3 text-center">
            <div className="text-xs uppercase text-muted-foreground">Lectures watched</div>
            <div className="text-2xl font-extrabold">{hist.data?.rows.length ?? 0}</div>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <div className="text-xs uppercase text-muted-foreground">Total watches</div>
            <div className="text-2xl font-extrabold">{totalWatches}</div>
          </CardContent></Card>
        </div>
      )}

      {studentId && hist.data?.rows.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">This student hasn't watched any lectures yet.</p>
      )}

      <div className="space-y-2">
        {hist.data?.rows.map((r) => (
          <Card key={r.lecture_id}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <PlayCircle className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  L {r.lecture_number}. {r.lecture_title}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {r.subject_name ?? "—"}{r.chapter_name ? ` · ${r.chapter_name}` : ""}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Last watched {new Date(r.last_watched_at).toLocaleString()}
                </div>
              </div>
              <Badge className="shrink-0">{r.watch_count}×</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
