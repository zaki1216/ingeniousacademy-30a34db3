import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ClipboardEdit, GraduationCap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  adminListOfflineTests, adminCreateOfflineTest, adminUpdateOfflineTest, adminDeleteOfflineTest,
  adminGetMarksSheet, adminUpsertMarks,
} from "@/lib/api/academic.functions";

export const Route = createFileRoute("/app/admin/offline-tests")({ component: AdminOfflineTests });

function AdminOfflineTests() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(adminListOfflineTests);
  const createFn = useServerFn(adminCreateOfflineTest);
  const updateFn = useServerFn(adminUpdateOfflineTest);
  const deleteFn = useServerFn(adminDeleteOfflineTest);

  const tests = useQuery({
    queryKey: ["offline-tests-admin"],
    queryFn: () => listFn(),
    enabled: role === "admin",
  });

  const subjects = useQuery({
    queryKey: ["subjects-all"],
    queryFn: async () => (await supabase.from("subjects").select("id, subject_name, standard_id")).data ?? [],
  });
  const chapters = useQuery({
    queryKey: ["chapters-all"],
    queryFn: async () => (await supabase.from("chapters").select("id, chapter_name, chapter_number, subject_id")).data ?? [],
  });

  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;

  const subjectLabel = (id: string) => subjects.data?.find((s) => s.id === id)?.subject_name ?? "—";
  const chapterLabel = (id?: string | null) =>
    id ? chapters.data?.find((c) => c.id === id)?.chapter_name ?? "—" : "All chapters";

  const onRefresh = () => qc.invalidateQueries({ queryKey: ["offline-tests-admin"] });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" /> Offline Tests
          </h1>
          <p className="text-sm text-muted-foreground">Teacher-entered marks. Drives the Report Card and Scholar leaderboard.</p>
        </div>
        <OfflineTestDialog
          subjects={subjects.data ?? []}
          chapters={chapters.data ?? []}
          onSubmit={async (vals) => { await createFn({ data: vals }); onRefresh(); }}
          trigger={<Button><Plus className="h-4 w-4 mr-2" /> New offline test</Button>}
        />
      </div>

      <div className="space-y-2">
        {(tests.data?.tests ?? []).map((t: any) => (
          <Card key={t.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ClipboardEdit className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{t.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {subjectLabel(t.subject_id)} · {chapterLabel(t.chapter_id)} · {new Date(t.test_date).toLocaleDateString()}
                </div>
                <Badge variant="secondary" className="mt-1">Max {t.max_marks}</Badge>
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                <MarksSheet test={t} />
                <OfflineTestDialog
                  initial={t}
                  subjects={subjects.data ?? []}
                  chapters={chapters.data ?? []}
                  onSubmit={async (vals) => { await updateFn({ data: { id: t.id, ...vals } }); onRefresh(); }}
                  trigger={<Button size="sm" variant="outline"><Pencil className="h-4 w-4" /></Button>}
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete offline test?</AlertDialogTitle>
                      <AlertDialogDescription>All marks for this test will be removed.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={async () => {
                        await deleteFn({ data: { id: t.id } });
                        onRefresh();
                        toast.success("Deleted");
                      }}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
        {(tests.data?.tests?.length ?? 0) === 0 && !tests.isLoading && (
          <p className="text-sm text-muted-foreground text-center py-8">No offline tests yet.</p>
        )}
      </div>
    </div>
  );
}

function OfflineTestDialog({
  initial, subjects, chapters, onSubmit, trigger,
}: {
  initial?: any;
  subjects: { id: string; subject_name: string }[];
  chapters: { id: string; chapter_name: string; chapter_number: number; subject_id: string }[];
  onSubmit: (vals: any) => Promise<void>;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subjectId, setSubjectId] = useState(initial?.subject_id ?? "");
  const [chapterId, setChapterId] = useState<string>(initial?.chapter_id ?? "__none__");
  const [maxMarks, setMaxMarks] = useState<number>(initial?.max_marks ?? 100);
  const [testDate, setTestDate] = useState<string>(initial?.test_date ?? new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const filteredChapters = useMemo(
    () => chapters.filter((c) => c.subject_id === subjectId),
    [chapters, subjectId],
  );

  async function submit() {
    if (!title || !subjectId || !maxMarks) return;
    setSaving(true);
    try {
      await onSubmit({
        title,
        subject_id: subjectId,
        chapter_id: chapterId === "__none__" ? null : chapterId,
        max_marks: Number(maxMarks),
        test_date: testDate,
      });
      toast.success("Saved");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{initial ? "Edit offline test" : "New offline test"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Algebra Unit Test 1" /></div>
          <div>
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setChapterId("__none__"); }}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Chapter (optional)</Label>
            <Select value={chapterId} onValueChange={setChapterId} disabled={!subjectId}>
              <SelectTrigger><SelectValue placeholder="All chapters / unspecified" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">All chapters / unspecified</SelectItem>
                {filteredChapters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>Ch {c.chapter_number}. {c.chapter_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Max marks</Label><Input type="number" value={maxMarks} onChange={(e) => setMaxMarks(Number(e.target.value))} /></div>
            <div><Label>Date</Label><Input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !title || !subjectId}>{saving ? "…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarksSheet({ test }: { test: any }) {
  const [open, setOpen] = useState(false);
  const sheetFn = useServerFn(adminGetMarksSheet);
  const upsertFn = useServerFn(adminUpsertMarks);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["marks-sheet", test.id],
    queryFn: () => sheetFn({ data: { offlineTestId: test.id } }),
    enabled: open,
  });

  const [edits, setEdits] = useState<Record<string, { marks_obtained: string; remarks: string }>>({});
  const [saving, setSaving] = useState(false);

  const rows = q.data?.rows ?? [];

  const merged = rows.map((r) => ({
    ...r,
    marks_str: edits[r.student_id]?.marks_obtained ?? (r.marks_obtained == null ? "" : String(r.marks_obtained)),
    remarks_v: edits[r.student_id]?.remarks ?? r.remarks ?? "",
  }));

  async function save() {
    setSaving(true);
    try {
      const payload = merged
        .map((r) => ({
          student_id: r.student_id,
          marks_str: r.marks_str.trim(),
          remarks: r.remarks_v,
        }))
        .filter((r) => r.marks_str !== "")
        .map((r) => {
          const n = Number(r.marks_str);
          return { student_id: r.student_id, marks_obtained: n, remarks: r.remarks || null };
        })
        .filter((r) => Number.isFinite(r.marks_obtained) && r.marks_obtained >= 0 && r.marks_obtained <= test.max_marks);
      await upsertFn({ data: { offlineTestId: test.id, marks: payload } });
      toast.success(`Saved ${payload.length} marks`);
      setEdits({});
      qc.invalidateQueries({ queryKey: ["marks-sheet", test.id] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setSaving(false); }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm"><ClipboardEdit className="h-4 w-4 mr-1" /> Marks</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{test.title} — Enter Marks</SheetTitle>
          <p className="text-xs text-muted-foreground">Max marks: {test.max_marks}</p>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {q.isLoading && <p className="text-sm text-muted-foreground">Loading students…</p>}
          {rows.length === 0 && !q.isLoading && (
            <p className="text-sm text-muted-foreground">No students in this subject's standard yet.</p>
          )}
          {merged.map((r) => (
            <div key={r.student_id} className="border rounded-md p-2 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{r.email}</div>
                </div>
                <Input
                  type="number"
                  className="w-24"
                  placeholder={`/${test.max_marks}`}
                  min={0}
                  max={test.max_marks}
                  value={r.marks_str}
                  onChange={(e) => setEdits((s) => ({ ...s, [r.student_id]: { marks_obtained: e.target.value, remarks: r.remarks_v } }))}
                />
              </div>
              <Textarea
                placeholder="Remarks (optional)"
                value={r.remarks_v}
                rows={1}
                onChange={(e) => setEdits((s) => ({ ...s, [r.student_id]: { marks_obtained: r.marks_str, remarks: e.target.value } }))}
              />
            </div>
          ))}
        </div>
        <div className="sticky bottom-0 bg-background pt-3 mt-3 border-t">
          <Button onClick={save} disabled={saving || rows.length === 0} className="w-full">
            {saving ? "Saving…" : "Save Marks"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
