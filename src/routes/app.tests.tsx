import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ClipboardList, ListChecks, Sword, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";

export const Route = createFileRoute("/app/tests")({ component: TestsPage });

function TestsPage() {
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const [managing, setManaging] = useState<string | null>(null);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id && role === "student",
    queryFn: async () => (await supabase.from("profiles").select("standard_id").eq("id", user!.id).maybeSingle()).data,
  });

  const chapters = useQuery({
    queryKey: ["chapters-all"],
    queryFn: async () => {
      const subs = (await supabase.from("subjects").select("id, subject_name, standard_id")).data ?? [];
      const chs = (await supabase.from("chapters").select("id, chapter_name, chapter_number, subject_id")).data ?? [];
      return chs.map((c) => {
        const s = subs.find((x) => x.id === c.subject_id);
        return { ...c, subject_name: s?.subject_name, standard_id: s?.standard_id };
      });
    },
  });

  const tests = useQuery({
    queryKey: ["tests"],
    queryFn: async () => (await supabase.from("tests").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const results = useQuery({
    queryKey: ["my-results", user?.id],
    enabled: !!user?.id && role === "student",
    queryFn: async () => (await supabase.from("results").select("test_id, percentage").eq("student_id", user!.id)).data ?? [],
  });

  const lecturesAll = useQuery({
    queryKey: ["lectures-all-min"],
    enabled: role === "student",
    queryFn: async () => (await supabase.from("lectures").select("id, chapter_id")).data ?? [],
  });
  const myCompletions = useQuery({
    queryKey: ["video-completions", user?.id],
    enabled: !!user?.id && role === "student",
    queryFn: async () => (await supabase.from("video_completions").select("lecture_id").eq("user_id", user!.id)).data ?? [],
  });

  const bossUnlocked = useMemo(() => {
    const map = new Map<string, boolean>();
    if (role !== "student") return map;
    const doneSet = new Set((myCompletions.data ?? []).map((c) => c.lecture_id));
    const byChapter = new Map<string, string[]>();
    for (const l of lecturesAll.data ?? []) {
      const arr = byChapter.get(l.chapter_id) ?? [];
      arr.push(l.id);
      byChapter.set(l.chapter_id, arr);
    }
    for (const [chId, lecIds] of byChapter) {
      map.set(chId, lecIds.length > 0 && lecIds.every((id) => doneSet.has(id)));
    }
    return map;
  }, [lecturesAll.data, myCompletions.data, role]);

  const visible = useMemo(() => {
    const list = tests.data ?? [];
    if (role === "admin") return list;
    const stdId = profile.data?.standard_id;
    if (!stdId) return [];
    const chapterIds = new Set((chapters.data ?? []).filter((c) => c.standard_id === stdId).map((c) => c.id));
    return list.filter((t) => chapterIds.has(t.chapter_id));
  }, [tests.data, chapters.data, role, profile.data]);

  const chLabel = (id: string) => {
    const c = chapters.data?.find((x) => x.id === id);
    return c ? `${c.subject_name} · Ch ${c.chapter_number}` : "—";
  };

  const myResult = (testId: string) => results.data?.find((r) => r.test_id === testId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Tests</h1>
          <p className="text-sm text-muted-foreground">{visible.length} available</p>
        </div>
        {role === "admin" && (
          <TestDialog
            chapters={chapters.data ?? []}
            onSubmit={async (vals) => {
              const { error } = await supabase.from("tests").insert(vals as any);
              if (error) throw error;
              qc.invalidateQueries({ queryKey: ["tests"] });
            }}
            trigger={<Button><Plus className="h-4 w-4 mr-2" />Add test</Button>}
          />
        )}
      </div>

      <div className="space-y-2">
        {visible.map((t) => {
          const r = myResult(t.id);
          return (
            <Card key={t.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{t.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{chLabel(t.chapter_id)} · {t.total_marks} marks</div>
                  {r && <Badge variant="secondary" className="mt-1">Last score: {r.percentage}%</Badge>}
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {role === "student" && (
                    <Button asChild size="sm">
                      <Link to="/app/tests/$testId" params={{ testId: t.id }}>{r ? "Retake" : "Start"}</Link>
                    </Button>
                  )}
                  {role === "admin" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setManaging(managing === t.id ? null : t.id)}>
                        <ListChecks className="h-4 w-4 mr-1" />Questions
                      </Button>
                      <TestDialog
                        initial={t}
                        chapters={chapters.data ?? []}
                        onSubmit={async (vals) => {
                          const { error } = await supabase.from("tests").update(vals as any).eq("id", t.id);
                          if (error) throw error;
                          qc.invalidateQueries({ queryKey: ["tests"] });
                        }}
                        trigger={<Button size="sm" variant="outline"><Pencil className="h-4 w-4" /></Button>}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete test?</AlertDialogTitle>
                            <AlertDialogDescription>All questions and results will be removed.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={async () => {
                              await supabase.from("results").delete().eq("test_id", t.id);
                              await supabase.from("questions").delete().eq("test_id", t.id);
                              await supabase.from("tests").delete().eq("id", t.id);
                              qc.invalidateQueries({ queryKey: ["tests"] });
                              toast.success("Deleted");
                            }}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </CardContent>
              {managing === t.id && role === "admin" && (
                <div className="border-t p-3">
                  <QuestionsManager testId={t.id} />
                </div>
              )}
            </Card>
          );
        })}
        {visible.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No tests yet.</p>
        )}
      </div>
    </div>
  );
}

// ---------- Test dialog ----------
function TestDialog({
  initial, chapters, onSubmit, trigger,
}: {
  initial?: any;
  chapters: { id: string; chapter_name: string; chapter_number: number; subject_name?: string }[];
  onSubmit: (vals: Record<string, any>) => Promise<void>;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [chapterId, setChapterId] = useState(initial?.chapter_id ?? "");
  const [totalMarks, setTotalMarks] = useState(initial?.total_marks ?? 0);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await onSubmit({ title, chapter_id: chapterId, total_marks: Number(totalMarks) });
      setOpen(false);
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{initial ? "Edit test" : "Add test"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div>
            <Label>Chapter</Label>
            <Select value={chapterId} onValueChange={setChapterId}>
              <SelectTrigger><SelectValue placeholder="Select chapter" /></SelectTrigger>
              <SelectContent>
                {chapters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.subject_name} · Ch {c.chapter_number}. {c.chapter_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Total marks (auto-calculated from questions)</Label><Input type="number" value={totalMarks} onChange={(e) => setTotalMarks(Number(e.target.value))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !title || !chapterId}>{saving ? "…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Questions manager ----------
function QuestionsManager({ testId }: { testId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["questions", testId],
    queryFn: async () => (await supabase.from("questions").select("*").eq("test_id", testId).order("question_order")).data ?? [],
  });

  async function refreshTotals() {
    const qs = (await supabase.from("questions").select("marks").eq("test_id", testId)).data ?? [];
    const total = qs.reduce((s, q) => s + (q.marks ?? 0), 0);
    await supabase.from("tests").update({ total_marks: total }).eq("id", testId);
    qc.invalidateQueries({ queryKey: ["tests"] });
    qc.invalidateQueries({ queryKey: ["questions", testId] });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Questions ({data?.length ?? 0})</div>
        <QuestionDialog
          testId={testId}
          nextOrder={(data?.length ?? 0) + 1}
          onSaved={refreshTotals}
          trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Question</Button>}
        />
      </div>
      {data?.map((q) => {
        const opts = Array.isArray(q.options) ? (q.options as string[]) : [];
        return (
          <div key={q.id} className="rounded-md border p-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">{q.question_order}. {q.question_text}</div>
                <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  {opts.map((o, i) => (
                    <li key={i} className={i === q.correct_option ? "text-primary font-medium" : ""}>
                      {String.fromCharCode(65 + i)}. {o}{i === q.correct_option && " ✓"}
                    </li>
                  ))}
                </ul>
                <div className="text-xs text-muted-foreground mt-1">{q.marks} mark{q.marks > 1 ? "s" : ""}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <QuestionDialog
                  testId={testId}
                  initial={q}
                  nextOrder={q.question_order}
                  onSaved={refreshTotals}
                  trigger={<Button size="sm" variant="outline"><Pencil className="h-4 w-4" /></Button>}
                />
                <Button size="sm" variant="outline" onClick={async () => {
                  await supabase.from("questions").delete().eq("id", q.id);
                  await refreshTotals();
                }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QuestionDialog({
  testId, initial, nextOrder, onSaved, trigger,
}: {
  testId: string;
  initial?: any;
  nextOrder: number;
  onSaved: () => Promise<void>;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial?.question_text ?? "");
  const [opts, setOpts] = useState<string[]>(
    Array.isArray(initial?.options) ? (initial.options as string[]) : ["", "", "", ""],
  );
  const [correct, setCorrect] = useState<number>(initial?.correct_option ?? 0);
  const [marks, setMarks] = useState<number>(initial?.marks ?? 1);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const payload = {
        test_id: testId,
        question_text: text,
        options: opts.filter((o) => o.trim() !== ""),
        correct_option: correct,
        marks: Number(marks),
        question_order: initial?.question_order ?? nextOrder,
      };
      if (initial) {
        const { error } = await supabase.from("questions").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("questions").insert(payload);
        if (error) throw error;
      }
      await onSaved();
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
        <DialogHeader><DialogTitle>{initial ? "Edit question" : "Add question"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Question</Label><Textarea value={text} onChange={(e) => setText(e.target.value)} /></div>
          {opts.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" checked={correct === i} onChange={() => setCorrect(i)} />
              <Input
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                value={o}
                onChange={(e) => {
                  const copy = [...opts];
                  copy[i] = e.target.value;
                  setOpts(copy);
                }}
              />
            </div>
          ))}
          <div><Label>Marks</Label><Input type="number" value={marks} onChange={(e) => setMarks(Number(e.target.value))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !text}>{saving ? "…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
