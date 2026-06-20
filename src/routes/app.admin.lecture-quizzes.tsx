import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, Save, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  adminListLectureQuizzes,
  adminUpsertLectureQuiz,
  adminGetQuizQuestions,
  adminUpsertQuestion,
  adminDeleteQuestion,
  adminSetManualUnlock,
  adminGetStudentProgress,
} from "@/lib/api/lecture-quiz-admin.functions";

export const Route = createFileRoute("/app/admin/lecture-quizzes")({ component: AdminLectureQuizzes });

function AdminLectureQuizzes() {
  const { role } = useAuth();
  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Lecture Quizzes</h1>
        <p className="text-sm text-muted-foreground">Configure lecture quizzes and unlock progression</p>
      </div>
      <Tabs defaultValue="quizzes">
        <TabsList>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          <TabsTrigger value="progress">Student Progress</TabsTrigger>
        </TabsList>
        <TabsContent value="quizzes" className="space-y-3 pt-3"><QuizzesTab /></TabsContent>
        <TabsContent value="progress" className="space-y-3 pt-3"><ProgressTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function QuizzesTab() {
  const standards = useQuery({ queryKey: ["std-all"], queryFn: async () => (await supabase.from("standards").select("id, standard_name").order("standard_name")).data ?? [] });
  const [standardId, setStandardId] = useState<string | null>(null);
  const subjects = useQuery({
    queryKey: ["subj-by-std", standardId],
    enabled: !!standardId,
    queryFn: async () => (await supabase.from("subjects").select("id, subject_name").eq("standard_id", standardId!)).data ?? [],
  });
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const chapters = useQuery({
    queryKey: ["ch-by-subj", subjectId],
    enabled: !!subjectId,
    queryFn: async () => (await supabase.from("chapters").select("id, chapter_name, chapter_number").eq("subject_id", subjectId!).order("chapter_number")).data ?? [],
  });
  const [chapterId, setChapterId] = useState<string | null>(null);

  const listFn = useServerFn(adminListLectureQuizzes);
  const list = useQuery({
    queryKey: ["admin-lq", subjectId, chapterId],
    enabled: !!subjectId || !!chapterId,
    queryFn: () => listFn({ data: { subjectId, chapterId } }),
  });

  const [editing, setEditing] = useState<any | null>(null);
  const [editQuestions, setEditQuestions] = useState<{ testId: string; lectureTitle: string } | null>(null);

  return (
    <>
      <Card><CardContent className="p-3 grid sm:grid-cols-3 gap-2">
        <Select value={standardId ?? ""} onValueChange={(v) => { setStandardId(v); setSubjectId(null); setChapterId(null); }}>
          <SelectTrigger><SelectValue placeholder="Standard" /></SelectTrigger>
          <SelectContent>{standards.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.standard_name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={subjectId ?? ""} onValueChange={(v) => { setSubjectId(v); setChapterId(null); }} disabled={!standardId}>
          <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>{subjects.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={chapterId ?? ""} onValueChange={setChapterId} disabled={!subjectId}>
          <SelectTrigger><SelectValue placeholder="Chapter (optional)" /></SelectTrigger>
          <SelectContent>{chapters.data?.map((c) => <SelectItem key={c.id} value={c.id}>Ch {c.chapter_number}. {c.chapter_name}</SelectItem>)}</SelectContent>
        </Select>
      </CardContent></Card>

      {list.isLoading && <Loader2 className="h-5 w-5 animate-spin mx-auto" />}

      <div className="space-y-2">
        {list.data?.rows.map((r) => (
          <Card key={r.lecture_id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">L {r.lecture_number}. {r.lecture_title}</div>
                  <div className="text-xs text-muted-foreground">Ch {r.chapter_number}. {r.chapter_name}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Quiz
                  </Button>
                  {r.test && (
                    <Button size="sm" variant="outline" onClick={() => setEditQuestions({ testId: r.test!.id, lectureTitle: r.lecture_title })}>
                      Questions ({r.question_count})
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <Stat label="Total" value={r.test ? `${r.test.total_marks}` : "—"} />
                <Stat label="Passing" value={r.test ? `${r.test.passing_marks}` : "—"} />
                <Stat label="Attempts" value={`${r.attempts}`} />
                <Stat label="Pass %" value={`${r.pass_rate}%`} />
              </div>
            </CardContent>
          </Card>
        ))}
        {list.data && list.data.rows.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Pick a subject to begin.</p>}
      </div>

      {editing && <EditQuizDialog row={editing} onClose={() => setEditing(null)} onSaved={() => list.refetch()} />}
      {editQuestions && <EditQuestionsDialog {...editQuestions} onClose={() => setEditQuestions(null)} onSaved={() => list.refetch()} />}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/30 rounded p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

function EditQuizDialog({ row, onClose, onSaved }: { row: any; onClose: () => void; onSaved: () => void }) {
  const upsert = useServerFn(adminUpsertLectureQuiz);
  const [title, setTitle] = useState(row.test?.title ?? `Quiz: ${row.lecture_title}`);
  const [mpq, setMpq] = useState(row.test?.marks_per_question ?? 1);
  const [questionCount, setQuestionCount] = useState(row.question_count ?? 10);
  const [passing, setPassing] = useState(row.test?.passing_marks ?? 6);
  const [time, setTime] = useState<number | "">(row.test?.time_limit_seconds ?? "");
  const [busy, setBusy] = useState(false);

  const total = mpq * questionCount;

  async function save() {
    setBusy(true);
    try {
      await upsert({
        data: {
          lectureId: row.lecture_id,
          title,
          marks_per_question: mpq,
          passing_marks: passing,
          total_marks: total,
          time_limit_seconds: time === "" ? null : Number(time),
        },
      });
      toast.success("Quiz saved");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Lecture Quiz · L{row.lecture_number}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Questions (target)</Label><Input type="number" min={1} value={questionCount} onChange={(e) => setQuestionCount(Math.max(1, +e.target.value))} /></div>
            <div><Label>Marks per question</Label><Input type="number" min={1} value={mpq} onChange={(e) => setMpq(Math.max(1, +e.target.value))} /></div>
            <div><Label>Total marks</Label><Input value={total} readOnly /></div>
            <div><Label>Passing marks</Label><Input type="number" min={0} value={passing} onChange={(e) => setPassing(Math.max(0, +e.target.value))} /></div>
            <div className="col-span-2"><Label>Time limit (seconds, optional)</Label><Input type="number" min={0} value={time} onChange={(e) => setTime(e.target.value === "" ? "" : Math.max(0, +e.target.value))} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1" /> Save</>}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditQuestionsDialog({ testId, lectureTitle, onClose, onSaved }: { testId: string; lectureTitle: string; onClose: () => void; onSaved: () => void }) {
  const getQs = useServerFn(adminGetQuizQuestions);
  const upsertQ = useServerFn(adminUpsertQuestion);
  const delQ = useServerFn(adminDeleteQuestion);
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["admin-qs", testId], queryFn: () => getQs({ data: { testId } }) });
  const [editing, setEditing] = useState<any | null>(null);

  function blankQuestion() {
    const nextOrder = (list.data?.questions.length ?? 0) + 1;
    setEditing({ id: null, test_id: testId, question_text: "", options: ["", "", "", ""], correct_option: 0, question_order: nextOrder, marks: 1 });
  }

  async function save(q: any) {
    try {
      await upsertQ({ data: q });
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-qs", testId] });
      onSaved();
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this question?")) return;
    await delQ({ data: { id } });
    qc.invalidateQueries({ queryKey: ["admin-qs", testId] });
    onSaved();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Questions · {lectureTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end"><Button size="sm" onClick={blankQuestion}><Plus className="h-3.5 w-3.5 mr-1" /> Add question</Button></div>
        <div className="space-y-2">
          {list.data?.questions.map((q: any) => (
            <Card key={q.id}>
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm">{q.question_order}. {q.question_text}</div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(q)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(q.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <ol className="text-xs text-muted-foreground list-[upper-alpha] ml-5">
                  {(q.options as string[]).map((o, i) => (
                    <li key={i} className={i === q.correct_option ? "text-emerald-500 font-semibold" : ""}>{o}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>

        {editing && (
          <Dialog open onOpenChange={() => setEditing(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing.id ? "Edit" : "Add"} question</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Label>Question</Label>
                <Input value={editing.question_text} onChange={(e) => setEditing({ ...editing, question_text: e.target.value })} />
                <Label>Options</Label>
                {editing.options.map((o: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" checked={editing.correct_option === i} onChange={() => setEditing({ ...editing, correct_option: i })} />
                    <Input value={o} onChange={(e) => {
                      const opts = [...editing.options];
                      opts[i] = e.target.value;
                      setEditing({ ...editing, options: opts });
                    }} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Order</Label><Input type="number" value={editing.question_order} onChange={(e) => setEditing({ ...editing, question_order: +e.target.value })} /></div>
                  <div><Label>Marks</Label><Input type="number" value={editing.marks} onChange={(e) => setEditing({ ...editing, marks: +e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={() => save(editing)}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProgressTab() {
  const standards = useQuery({ queryKey: ["std-all-p"], queryFn: async () => (await supabase.from("standards").select("id, standard_name").order("standard_name")).data ?? [] });
  const [standardId, setStandardId] = useState<string | null>(null);
  const getProgress = useServerFn(adminGetStudentProgress);
  const setUnlock = useServerFn(adminSetManualUnlock);
  const data = useQuery({
    queryKey: ["admin-progress", standardId],
    enabled: !!standardId,
    queryFn: () => getProgress({ data: { standardId: standardId! } }),
  });

  const passByKey = useMemo(() => {
    const m = new Map<string, boolean>();
    if (!data.data) return m;
    const testById = new Map(data.data.tests.map((t: any) => [t.id, t]));
    for (const a of data.data.attempts as any[]) {
      const t: any = testById.get(a.test_id);
      if (!t) continue;
      const score = (a.correct_count ?? 0) * (t.marks_per_question ?? 1);
      const pass = score >= (t.passing_marks ?? 0) && (t.passing_marks ?? 0) > 0;
      const k = `${a.student_id}::${a.lecture_id}`;
      if (pass) m.set(k, true);
      else if (!m.has(k)) m.set(k, false);
    }
    return m;
  }, [data.data]);

  async function toggle(studentId: string, lectureId: string, current: boolean) {
    try {
      await setUnlock({ data: { studentId, lectureId, unlocked: !current } });
      toast.success("Updated");
      data.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  return (
    <>
      <Select value={standardId ?? ""} onValueChange={setStandardId}>
        <SelectTrigger><SelectValue placeholder="Standard" /></SelectTrigger>
        <SelectContent>{standards.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.standard_name}</SelectItem>)}</SelectContent>
      </Select>

      {data.data && (
        <div className="overflow-x-auto">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr className="text-left">
                <th className="p-2">Student</th>
                {data.data.lectures.map((l: any) => <th key={l.id} className="p-2 whitespace-nowrap">L{l.lecture_number}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.data.students.map((s: any) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-2 font-medium whitespace-nowrap">{s.name ?? s.email}</td>
                  {data.data!.lectures.map((l: any) => {
                    const passed = passByKey.get(`${s.id}::${l.id}`) === true;
                    return (
                      <td key={l.id} className="p-2 text-center">
                        <button
                          className={passed ? "text-emerald-500" : "text-muted-foreground"}
                          title="Toggle manual unlock"
                          onClick={() => toggle(s.id, l.id, passed)}
                        >
                          {passed ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
