import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useMemo, useState } from "react";
import { Search, PlayCircle, CheckCircle2, Gift, Loader2, BrainCircuit, Coins, Lock, Trophy, XCircle, Timer } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { YouTubePlayer } from "@/components/gamification/YouTubePlayer";
import { RewardPopup, type RewardPayload } from "@/components/gamification/RewardPopup";
import { FloatingReward, type FloatingRewardPayload } from "@/components/rpg/FloatingReward";
import { completeVideo } from "@/lib/api/gamification.functions";
import { getQuizForLecture, submitLectureQuiz } from "@/lib/api/lecture-quiz.functions";
import { getLectureProgress } from "@/lib/api/lecture-progression.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/lectures")({ component: LecturesPage });

function LecturesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const completeFn = useServerFn(completeVideo);
  const progressFn = useServerFn(getLectureProgress);

  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("all");
  const [activeLecture, setActiveLecture] = useState<{ id: string; url: string; title: string } | null>(null);
  const [reward, setReward] = useState<RewardPayload | null>(null);
  const [floating, setFloating] = useState<FloatingRewardPayload | null>(null);
  const [claimReady, setClaimReady] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimDone, setClaimDone] = useState(false);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await supabase.from("profiles").select("standard_id").eq("id", user!.id).maybeSingle()).data,
  });
  const standardId = profile.data?.standard_id;

  const subjects = useQuery({
    queryKey: ["subjects-by-std", standardId],
    enabled: !!standardId,
    queryFn: async () => (await supabase.from("subjects").select("id, subject_name").eq("standard_id", standardId!)).data ?? [],
  });

  const completions = useQuery({
    queryKey: ["video-completions", user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await supabase.from("video_completions").select("lecture_id").eq("user_id", user!.id)).data ?? [],
  });
  const completedSet = useMemo(() => new Set((completions.data ?? []).map((c) => c.lecture_id)), [completions.data]);

  const progress = useQuery({
    queryKey: ["lecture-progress", user?.id],
    enabled: !!user?.id,
    queryFn: () => progressFn(),
  });
  const stateById = useMemo(() => {
    type S = NonNullable<typeof progress.data>["states"][number];
    const m = new Map<string, S>();
    for (const s of progress.data?.states ?? []) m.set(s.lecture_id, s);
    return m;
  }, [progress.data]);

  const lectures = useQuery({
    queryKey: ["lectures-flat", standardId],
    enabled: !!standardId,
    queryFn: async () => {
      const subs = (await supabase.from("subjects").select("id, subject_name").eq("standard_id", standardId!)).data ?? [];
      if (subs.length === 0) return [];
      const chapters = (await supabase.from("chapters").select("id, chapter_name, chapter_number, subject_id").in("subject_id", subs.map((s) => s.id))).data ?? [];
      if (chapters.length === 0) return [];
      const lecs = (await supabase.from("lectures").select("*").in("chapter_id", chapters.map((c) => c.id)).order("lecture_number")).data ?? [];
      return lecs.map((l) => {
        const ch = chapters.find((c) => c.id === l.chapter_id);
        const sub = subs.find((s) => s.id === ch?.subject_id);
        return { ...l, chapter_name: ch?.chapter_name, chapter_number: ch?.chapter_number, subject_id: sub?.id, subject_name: sub?.subject_name };
      });
    },
  });

  // Group lectures by subject → chapter, sorted
  const grouped = useMemo(() => {
    const all = (lectures.data ?? []).filter((l) =>
      (subjectId === "all" || l.subject_id === subjectId) &&
      (search === "" ||
        l.lecture_title.toLowerCase().includes(search.toLowerCase()) ||
        l.chapter_name?.toLowerCase().includes(search.toLowerCase())),
    );
    const map = new Map<string, { chapter_id: string; chapter_name: string; chapter_number: number; subject_name: string; lectures: typeof all }>();
    for (const l of all) {
      const key = `${l.subject_id}::${l.chapter_id}`;
      const entry = map.get(key) ?? {
        chapter_id: l.chapter_id,
        chapter_name: l.chapter_name ?? "",
        chapter_number: l.chapter_number ?? 0,
        subject_name: l.subject_name ?? "",
        lectures: [] as typeof all,
      };
      entry.lectures.push(l);
      map.set(key, entry);
    }
    const arr = Array.from(map.values());
    arr.forEach((g) => g.lectures.sort((a, b) => a.lecture_number - b.lecture_number));
    arr.sort((a, b) => a.subject_name.localeCompare(b.subject_name) || a.chapter_number - b.chapter_number);
    return arr;
  }, [lectures.data, subjectId, search]);

  const chapterAggById = useMemo(() => {
    type C = NonNullable<typeof progress.data>["chapters"][number];
    const m = new Map<string, C>();
    for (const c of progress.data?.chapters ?? []) m.set(c.chapter_id, c);
    return m;
  }, [progress.data]);

  const handleVideoEnded = useCallback(() => {
    if (!activeLecture) return;
    if (completedSet.has(activeLecture.id)) setClaimDone(true);
    else setClaimReady(true);
  }, [activeLecture, completedSet]);

  const handleClaim = useCallback(async () => {
    if (!activeLecture || claiming || claimDone) return;
    setClaiming(true);
    try {
      const r = await completeFn({ data: { lectureId: activeLecture.id } });
      setClaimDone(true);
      setClaimReady(false);
      if (!r.alreadyCompleted) {
        setFloating({ xp: r.xpAwarded, coins: r.coinsAwarded, label: "Lecture", key: Date.now() });
        setReward({ ...r, title: "Lecture complete!" });
        qc.invalidateQueries({ queryKey: ["video-completions"] });
        qc.invalidateQueries({ queryKey: ["gam-dashboard"] });
      }
    } catch {
      /* silent */
    } finally {
      setClaiming(false);
    }
  }, [activeLecture, claiming, claimDone, completeFn, qc]);

  const openLecture = useCallback(
    (l: { id: string; url: string; title: string }) => {
      const st = stateById.get(l.id);
      if (st && !st.unlocked) {
        toast.error("Locked", { description: `Pass Lecture ${st.prev_lecture_number ?? ""} quiz first.` });
        return;
      }
      setActiveLecture(l);
      setClaimReady(false);
      setClaiming(false);
      setClaimDone(completedSet.has(l.id));
    },
    [completedSet, stateById],
  );

  if (!standardId) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Lectures</h1>
        <p className="text-muted-foreground text-sm">Your standard is not set yet. Please contact your admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <RewardPopup reward={reward} onClose={() => setReward(null)} />
      <FloatingReward reward={floating} />
      <div>
        <h1 className="text-2xl font-bold">Lectures</h1>
        <p className="text-sm text-muted-foreground">Watch in order — pass each quiz to unlock the next lecture</p>
      </div>

      {activeLecture && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <YouTubePlayer url={activeLecture.url} title={activeLecture.title} onComplete={handleVideoEnded} />
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold truncate">{activeLecture.title}</div>
              <button className="text-sm text-muted-foreground shrink-0" onClick={() => setActiveLecture(null)}>Close</button>
            </div>
            {(claimReady || claimDone) && (
              <Button
                onClick={handleClaim}
                disabled={claiming || claimDone}
                className={cn(
                  "w-full font-orbitron uppercase tracking-wider",
                  claimDone
                    ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                    : "bg-amber-500 hover:bg-amber-400 text-amber-950 animate-pulse",
                )}
              >
                {claiming ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Claiming…</>
                ) : claimDone ? (
                  <><CheckCircle2 className="h-4 w-4 mr-2" /> Reward Claimed</>
                ) : (
                  <><Gift className="h-4 w-4 mr-2" /> Claim +50 XP &amp; coins</>
                )}
              </Button>
            )}
            <LectureQuizPanel
              lectureId={activeLecture.id}
              onResult={() => {
                qc.invalidateQueries({ queryKey: ["lecture-progress"] });
              }}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="pl-9" />
        </div>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {grouped.map((g) => {
          const agg = chapterAggById.get(g.chapter_id);
          return (
            <div key={g.chapter_id} className="space-y-2">
              <Card className="bg-muted/30">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">{g.subject_name}</div>
                      <div className="font-semibold truncate">Ch {g.chapter_number}. {g.chapter_name}</div>
                    </div>
                    {agg && (
                      <div className="text-right text-xs shrink-0">
                        <div className="font-bold">{agg.passed}/{agg.total}</div>
                        <div className="text-muted-foreground">{agg.percent}%</div>
                      </div>
                    )}
                  </div>
                  {agg && <Progress value={agg.percent} className="h-1.5" />}
                  {agg?.next_to_unlock && (
                    <div className="text-xs text-muted-foreground">
                      Next: Lecture {agg.next_to_unlock.lecture_number}
                    </div>
                  )}
                  {agg && agg.passed === agg.total && agg.total > 0 && (
                    <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                      <Trophy className="h-3.5 w-3.5" /> Chapter complete · Boss battle unlocked
                    </div>
                  )}
                </CardContent>
              </Card>

              {g.lectures.map((l) => {
                const done = completedSet.has(l.id);
                const st = stateById.get(l.id);
                const locked = st ? !st.unlocked : false;
                return (
                  <Card
                    key={l.id}
                    className={cn(
                      "transition",
                      locked ? "opacity-60" : "cursor-pointer hover:bg-accent/30",
                    )}
                    onClick={() => !locked && openLecture({ id: l.id, url: l.youtube_url, title: l.lecture_title })}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={cn(
                        "h-12 w-12 rounded-lg flex items-center justify-center shrink-0",
                        locked ? "bg-muted text-muted-foreground" : done ? "bg-green-500/15 text-green-600" : "bg-primary/10 text-primary",
                      )}>
                        {locked ? <Lock className="h-6 w-6" /> : done ? <CheckCircle2 className="h-6 w-6" /> : <PlayCircle className="h-6 w-6" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">L {l.lecture_number}. {l.lecture_title}</div>
                        {locked ? (
                          <div className="text-xs text-muted-foreground truncate">
                            Pass Lecture {st?.prev_lecture_number} quiz
                            {st && st.prev_passing_marks > 0 && st.prev_total_marks > 0
                              ? ` (${st.prev_passing_marks}/${st.prev_total_marks})`
                              : ""} to unlock
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground truncate">
                            {st?.quiz_passed ? "Quiz passed ✓" : st?.test_id ? `Quiz: ${st.passing_marks}/${st.total_marks} to pass` : "Watch to earn XP"}
                          </div>
                        )}
                      </div>
                      {!locked && done && <span className="text-[10px] font-semibold text-green-600 uppercase">+50 XP</span>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })}
        {grouped.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No lectures found.</p>
        )}
      </div>
    </div>
  );
}

function LectureQuizPanel({ lectureId, onResult }: { lectureId: string; onResult?: () => void }) {
  const qc = useQueryClient();
  const getQuiz = useServerFn(getQuizForLecture);
  const submit = useServerFn(submitLectureQuiz);

  const quiz = useQuery({
    queryKey: ["lecture-quiz", lectureId],
    queryFn: () => getQuiz({ data: { lectureId } }),
  });

  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Awaited<ReturnType<typeof submit>> | null>(null);
  const [busy, setBusy] = useState(false);

  const test = quiz.data?.test;
  const questions = quiz.data?.questions ?? [];

  function start() {
    setAnswers({});
    setResult(null);
    setOpen(true);
  }

  async function send() {
    if (!test) return;
    setBusy(true);
    try {
      const r = await submit({ data: { testId: test.id, answers } });
      setResult(r);
      if (r.passed) toast.success(`PASS · +${r.coinsAwarded} coins · next lecture unlocked`);
      else toast.error(`FAIL · ${r.score}/${r.totalMarks} (need ${r.passingMarks})`);
      qc.invalidateQueries({ queryKey: ["gam-dashboard"] });
      qc.invalidateQueries({ queryKey: ["lecture-quiz", lectureId] });
      onResult?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (!test) return null;

  const passingMarks = (test as any).passing_marks ?? 0;
  const mpq = (test as any).marks_per_question ?? 1;
  const timeLimit = (test as any).time_limit_seconds as number | null | undefined;

  return (
    <>
      <Button
        variant="outline"
        className="w-full border-cyan-500/40 hover:bg-cyan-500/10"
        onClick={start}
      >
        <BrainCircuit className="h-4 w-4 mr-2 text-cyan-400" />
        Lecture Quiz · {passingMarks > 0 ? `Pass ${passingMarks}/${test.total_marks ?? questions.length * mpq} to unlock next` : "Practice"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-cyan-400" /> {test.title}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {questions.length} questions · {mpq} mark{mpq === 1 ? "" : "s"} each · Pass {passingMarks}/{test.total_marks ?? questions.length * mpq}
              {timeLimit ? <> · <Timer className="h-3 w-3 inline" /> {Math.round(timeLimit / 60)} min</> : null}
            </p>
            {quiz.data?.bestScore != null && quiz.data.bestScore > 0 && (
              <p className="text-xs text-muted-foreground">Best so far: {quiz.data.bestScore}</p>
            )}
          </DialogHeader>

          {result ? (
            <div className="space-y-3 py-4 text-center">
              <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold", result.passed ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500")}>
                {result.passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {result.passed ? "PASS" : "FAIL"}
              </div>
              <div className="text-4xl font-extrabold font-orbitron">
                {result.correct}/{result.total}
              </div>
              <div className="text-sm text-muted-foreground">
                Score {result.score}/{result.totalMarks} · need {result.passingMarks}
              </div>
              <div className="flex items-center justify-center gap-2 text-amber-400 font-bold">
                <Coins className="h-5 w-5" /> +{result.coinsAwarded} coins
              </div>
              {result.passed ? (
                result.nextLectureUnlocked ? (
                  <p className="text-xs text-emerald-500 font-medium">Next lecture unlocked</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Chapter complete!</p>
                )
              ) : (
                <p className="text-xs text-muted-foreground">Next lecture stays locked · retry to unlock</p>
              )}
              {result.chapterCompleted && (
                <div className="flex items-center justify-center gap-1 text-sm text-amber-500 font-bold">
                  <Trophy className="h-4 w-4" /> Chapter complete · +{result.chapterCompleted.xp} XP · +{result.chapterCompleted.coins} coins
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, i) => (
                <div key={q.id} className="space-y-2">
                  <div className="text-sm font-medium">
                    {i + 1}. {q.question_text}
                  </div>
                  <div className="space-y-1">
                    {q.options.map((opt, idx) => (
                      <label
                        key={idx}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded border cursor-pointer text-sm",
                          answers[q.id] === idx ? "border-primary bg-primary/10" : "border-border",
                        )}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === idx}
                          onChange={() => setAnswers((s) => ({ ...s, [q.id]: idx }))}
                        />
                        <span>{String.fromCharCode(65 + idx)}. {opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            {result ? (
              <Button onClick={() => { setResult(null); setAnswers({}); }} variant="outline">
                {result.passed ? "Replay" : "Retry Quiz"}
              </Button>
            ) : (
              <Button
                onClick={send}
                disabled={busy || Object.keys(answers).length !== questions.length}
              >
                {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : "Submit quiz"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
