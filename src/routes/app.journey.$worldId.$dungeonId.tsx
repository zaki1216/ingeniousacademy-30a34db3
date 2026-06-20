import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft, PlayCircle, CheckCircle2, Lock, Loader2, Gift,
  BrainCircuit, Coins, XCircle, Timer, Skull, Crown, Trophy,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export const Route = createFileRoute("/app/journey/$worldId/$dungeonId")({ component: DungeonPage });

function DungeonPage() {
  const { worldId, dungeonId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const completeFn = useServerFn(completeVideo);
  const progressFn = useServerFn(getLectureProgress);

  const [activeLecture, setActiveLecture] = useState<{ id: string; url: string; title: string; number: number } | null>(null);
  const [reward, setReward] = useState<RewardPayload | null>(null);
  const [floating, setFloating] = useState<FloatingRewardPayload | null>(null);
  const [claimReady, setClaimReady] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimDone, setClaimDone] = useState(false);
  const [bossOpen, setBossOpen] = useState(false);

  const meta = useQuery({
    queryKey: ["dungeon-meta", dungeonId],
    queryFn: async () => {
      const ch = (await supabase.from("chapters").select("id, chapter_name, chapter_number, subject_id, completion_xp, completion_coins").eq("id", dungeonId).maybeSingle()).data;
      const lecs = (await supabase.from("lectures").select("id, lecture_title, lecture_number, youtube_url").eq("chapter_id", dungeonId).order("lecture_number")).data ?? [];
      return { ch, lecs };
    },
  });

  const completions = useQuery({
    queryKey: ["video-completions", user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await supabase.from("video_completions").select("lecture_id").eq("user_id", user!.id)).data ?? [],
  });
  const completedSet = useMemo(() => new Set((completions.data ?? []).map((c) => c.lecture_id)), [completions.data]);

  const chapterCompletion = useQuery({
    queryKey: ["chapter-completion", dungeonId, user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase
        .from("chapter_completions")
        .select("xp_awarded, coins_awarded, completed_at")
        .eq("user_id", user!.id)
        .eq("chapter_id", dungeonId)
        .maybeSingle()).data,
  });

  const progress = useQuery({
    queryKey: ["lecture-progress", user?.id],
    enabled: !!user?.id,
    queryFn: () => progressFn(),
  });

  const lectures = meta.data?.lecs ?? [];
  const stateById = useMemo(() => {
    type S = NonNullable<typeof progress.data>["states"][number];
    const m = new Map<string, S>();
    for (const s of progress.data?.states ?? []) m.set(s.lecture_id, s);
    return m;
  }, [progress.data]);

  const chAgg = useMemo(
    () => (progress.data?.chapters ?? []).find((c) => c.chapter_id === dungeonId) ?? null,
    [progress.data, dungeonId],
  );

  const allPassed = !!chAgg && chAgg.total > 0 && chAgg.passed === chAgg.total;
  const bossDefeated = !!chapterCompletion.data;

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
        setFloating({ xp: r.xpAwarded, coins: r.coinsAwarded, label: "Quest", key: Date.now() });
        setReward({ ...r, title: "Quest cleared!" });
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
    (l: { id: string; url: string; title: string; number: number }, locked: boolean, prevNum?: number | null) => {
      if (locked) {
        toast.error("Quest locked", { description: `Pass Quest ${prevNum ?? ""} quiz first.` });
        return;
      }
      setActiveLecture(l);
      setClaimReady(false);
      setClaiming(false);
      setClaimDone(completedSet.has(l.id));
    },
    [completedSet],
  );

  const dungeonName = meta.data?.ch?.chapter_name ?? "Dungeon";
  const dungeonNumber = meta.data?.ch?.chapter_number ?? "";
  const bossXp = meta.data?.ch?.completion_xp ?? 100;
  const bossCoins = meta.data?.ch?.completion_coins ?? 50;

  return (
    <div className="space-y-4">
      <RewardPopup reward={reward} onClose={() => setReward(null)} />
      <FloatingReward reward={floating} />

      <Link
        to="/app/journey/$worldId"
        params={{ worldId }}
        className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to dungeons
      </Link>

      <div>
        <div className="text-[10px] uppercase tracking-widest text-amber-300 font-orbitron font-bold">
          Dungeon {dungeonNumber}
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold font-orbitron">{dungeonName}</h1>
        {chAgg && (
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold">{chAgg.passed} / {chAgg.total} Quests cleared</span>
              <span className="text-muted-foreground">{chAgg.percent}%</span>
            </div>
            <Progress value={chAgg.percent} className="h-1.5" />
          </div>
        )}
      </div>

      {activeLecture && (
        <Card className="border-primary/30">
          <CardContent className="p-3 space-y-2">
            <YouTubePlayer url={activeLecture.url} title={activeLecture.title} onComplete={handleVideoEnded} />
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">Quest {activeLecture.number}</div>
                <div className="font-semibold truncate">{activeLecture.title}</div>
              </div>
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
                  <><CheckCircle2 className="h-4 w-4 mr-2" /> Reward claimed</>
                ) : (
                  <><Gift className="h-4 w-4 mr-2" /> Claim +50 XP</>
                )}
              </Button>
            )}
            <QuestQuizPanel
              lectureId={activeLecture.id}
              onResult={() => {
                qc.invalidateQueries({ queryKey: ["lecture-progress"] });
                qc.invalidateQueries({ queryKey: ["chapter-completion"] });
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Quest list */}
      <div className="space-y-2">
        {lectures.map((l, i) => {
          const st = stateById.get(l.id);
          const locked = st ? !st.unlocked : i !== 0;
          const done = completedSet.has(l.id);
          const passed = !!st?.quiz_passed;
          return (
            <Card
              key={l.id}
              className={cn(
                "transition",
                locked ? "opacity-60" : "cursor-pointer hover:bg-accent/30",
              )}
              onClick={() => openLecture(
                { id: l.id, url: l.youtube_url, title: l.lecture_title, number: l.lecture_number },
                locked,
                st?.prev_lecture_number ?? null,
              )}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className={cn(
                  "h-12 w-12 rounded-lg flex items-center justify-center shrink-0 font-orbitron font-black",
                  locked ? "bg-muted text-muted-foreground"
                  : passed ? "bg-emerald-500/15 text-emerald-500"
                  : done ? "bg-cyan-500/15 text-cyan-500"
                  : "bg-primary/10 text-primary",
                )}>
                  {locked ? <Lock className="h-5 w-5" /> : passed ? <CheckCircle2 className="h-5 w-5" /> : done ? <PlayCircle className="h-5 w-5" /> : String(l.lecture_number).padStart(2, "0")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">
                    Quest {String(l.lecture_number).padStart(2, "0")}
                  </div>
                  <div className="font-medium truncate">{l.lecture_title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {locked
                      ? `Pass Quest ${st?.prev_lecture_number} quiz to unlock`
                      : passed
                      ? "Quiz cleared ✓"
                      : st?.test_id
                      ? `Quiz · pass ${st.passing_marks}/${st.total_marks}`
                      : "Watch to earn XP"}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {lectures.length === 0 && !meta.isLoading && (
          <p className="text-sm text-muted-foreground text-center py-8">No quests in this dungeon yet.</p>
        )}
      </div>

      {/* Boss battle node */}
      {lectures.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <button
            type="button"
            disabled={!allPassed && !bossDefeated}
            onClick={() => setBossOpen(true)}
            className={cn(
              "block w-full text-left rounded-2xl p-4 border-2 transition relative overflow-hidden",
              bossDefeated
                ? "border-amber-400/60 bg-gradient-to-br from-amber-500/20 to-orange-600/20"
                : allPassed
                ? "border-rose-500/60 bg-gradient-to-br from-rose-600/30 to-red-900/40 animate-pulse cursor-pointer"
                : "border-border/40 bg-card/40 opacity-70 cursor-not-allowed",
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-16 w-16 rounded-2xl grid place-items-center shrink-0 shadow-xl",
                bossDefeated
                  ? "bg-gradient-to-br from-amber-400 to-orange-700"
                  : allPassed
                  ? "bg-gradient-to-br from-rose-500 to-red-900"
                  : "bg-muted",
              )}>
                {bossDefeated ? <Crown className="h-8 w-8 text-amber-100 drop-shadow" />
                  : allPassed ? <Skull className="h-8 w-8 text-rose-100 drop-shadow" />
                  : <Lock className="h-7 w-7 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">
                  Boss Battle
                </div>
                <div className="font-extrabold font-orbitron">
                  {bossDefeated ? "Boss Defeated" : allPassed ? "Engage the Boss" : "Sealed Boss Room"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {bossDefeated
                    ? `Cleared · +${chapterCompletion.data?.xp_awarded ?? bossXp} XP · +${chapterCompletion.data?.coins_awarded ?? bossCoins} coins`
                    : allPassed
                    ? `Reward: +${bossXp} XP · +${bossCoins} coins`
                    : `Clear all ${chAgg?.total ?? lectures.length} Quests to break the seal`}
                </div>
              </div>
              {bossDefeated && <Trophy className="h-6 w-6 text-amber-300 shrink-0" />}
            </div>
          </button>
        </motion.div>
      )}

      <Dialog open={bossOpen} onOpenChange={setBossOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-orbitron">
              {bossDefeated ? <Crown className="h-5 w-5 text-amber-400" /> : <Skull className="h-5 w-5 text-rose-400" />}
              {bossDefeated ? "Victory!" : "Boss Battle"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-center py-4">
            <div className="text-6xl">{bossDefeated ? "👑" : "💀"}</div>
            <div className="font-extrabold text-lg font-orbitron">
              {bossDefeated ? `${dungeonName} cleared` : `${dungeonName} Boss`}
            </div>
            <div className="text-sm text-muted-foreground">
              {bossDefeated
                ? "You've conquered every quest in this dungeon. Glory is yours."
                : "Boss rewards are awarded automatically when you pass the final quest quiz."}
            </div>
            <div className="flex justify-center gap-3 text-sm font-bold">
              <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-400">
                +{chapterCompletion.data?.xp_awarded ?? bossXp} XP
              </span>
              <span className="px-3 py-1 rounded-full bg-yellow-500/15 text-yellow-400 inline-flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" /> +{chapterCompletion.data?.coins_awarded ?? bossCoins}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setBossOpen(false)} className="w-full">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuestQuizPanel({ lectureId, onResult }: { lectureId: string; onResult?: () => void }) {
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
      if (r.passed) toast.success(`Quest cleared · +${r.coinsAwarded} coins · next quest unlocked`);
      else toast.error(`Failed · ${r.score}/${r.totalMarks} (need ${r.passingMarks})`);
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
        Quest Quiz · {passingMarks > 0 ? `Pass ${passingMarks}/${test.total_marks ?? questions.length * mpq}` : "Practice"}
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
                {result.passed ? "QUEST CLEARED" : "QUEST FAILED"}
              </div>
              <div className="text-4xl font-extrabold font-orbitron">
                {result.correct}/{result.total}
              </div>
              <div className="text-xs text-muted-foreground">
                Score {result.score}/{result.totalMarks} · Pass {result.passingMarks}
              </div>
              {result.coinsAwarded > 0 && (
                <div className="inline-flex items-center gap-1 text-amber-400 font-bold">
                  <Coins className="h-4 w-4" /> +{result.coinsAwarded} coins
                </div>
              )}
              {result.chapterCompleted && (
                <div className="rounded-xl border border-amber-400/50 bg-amber-500/10 p-3">
                  <div className="font-orbitron font-bold text-amber-400 flex items-center justify-center gap-2">
                    <Crown className="h-4 w-4" /> Boss Defeated
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    +{result.chapterCompleted.xp} XP · +{result.chapterCompleted.coins} coins
                  </div>
                </div>
              )}
              <DialogFooter className="sm:justify-center">
                {!result.passed && <Button onClick={start} variant="outline">Retry</Button>}
                <Button onClick={() => setOpen(false)}>Close</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, i) => (
                <div key={q.id} className="space-y-2">
                  <div className="text-sm font-semibold">{i + 1}. {q.question_text}</div>
                  <div className="space-y-1.5">
                    {q.options.map((opt, j) => {
                      const checked = answers[q.id] === j;
                      return (
                        <button
                          key={j}
                          type="button"
                          onClick={() => setAnswers((a) => ({ ...a, [q.id]: j }))}
                          className={cn(
                            "w-full text-left text-sm px-3 py-2 rounded-lg border transition",
                            checked
                              ? "border-primary bg-primary/10"
                              : "border-border hover:bg-accent/50",
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <DialogFooter>
                <Button onClick={send} disabled={busy || Object.keys(answers).length < questions.length} className="w-full">
                  {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : "Submit Quiz"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
