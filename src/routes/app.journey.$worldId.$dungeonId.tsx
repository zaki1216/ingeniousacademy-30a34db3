import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, CheckCircle2, Loader2, Gift, Coins, Shield, Crown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { YouTubePlayer } from "@/components/gamification/YouTubePlayer";
import { RewardPopup, type RewardPayload } from "@/components/gamification/RewardPopup";
import { FloatingReward, type FloatingRewardPayload } from "@/components/rpg/FloatingReward";
import { AdventureMap } from "@/components/adventure/AdventureMap";
import { AdventureProgressPanel } from "@/components/adventure/AdventureProgressPanel";
import { ADVENTURE_TERMS, type AdventureNode } from "@/lib/adventure/terminology";
import { completeVideo, getGamificationDashboard } from "@/lib/api/gamification.functions";
import { getLectureProgress } from "@/lib/api/lecture-progression.functions";
import { useDailyMissions } from "@/lib/learning/useContinueLearning";
import { cn } from "@/lib/utils";

const QUEST_XP = 50;

/** Light haptic feedback on supported devices; silently ignored elsewhere. */
function haptic(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

export const Route = createFileRoute("/app/journey/$worldId/$dungeonId")({
  validateSearch: (search: Record<string, unknown>): { lesson?: string } => ({
    lesson: typeof search.lesson === "string" ? search.lesson : undefined,
  }),
  component: DungeonPage,
});

function DungeonPage() {
  const { worldId, dungeonId } = Route.useParams();
  const { lesson } = Route.useSearch();
  const { user } = useAuth();
  const qc = useQueryClient();
  const reduce = useReducedMotion();
  const completeFn = useServerFn(completeVideo);
  const progressFn = useServerFn(getLectureProgress);
  const dashFn = useServerFn(getGamificationDashboard);

  const [activeLecture, setActiveLecture] = useState<{ id: string; url: string; title: string; number: number } | null>(null);
  const [reward, setReward] = useState<RewardPayload | null>(null);
  const [floating, setFloating] = useState<FloatingRewardPayload | null>(null);
  const [claimReady, setClaimReady] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimDone, setClaimDone] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const [chestOpen, setChestOpen] = useState(false);

  const meta = useQuery({
    queryKey: ["dungeon-meta", dungeonId],
    queryFn: async () => {
      const ch = (await supabase.from("chapters").select("id, chapter_name, chapter_number, subject_id, completion_xp, completion_coins").eq("id", dungeonId).maybeSingle()).data;
      const lecs = (await supabase.from("lectures").select("id, lecture_title, lecture_number, youtube_url").eq("chapter_id", dungeonId).eq("status", "published").order("lecture_number")).data ?? [];
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

  const dash = useQuery({
    queryKey: ["gam-dashboard", user?.id],
    enabled: !!user?.id,
    queryFn: () => dashFn(),
    staleTime: 30_000,
  });

  const missions = useDailyMissions();

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

  const allCompleted = !!chAgg && chAgg.total > 0 && chAgg.completed === chAgg.total;
  const trialCleared = !!chapterCompletion.data;

  const dungeonName = meta.data?.ch?.chapter_name ?? ADVENTURE_TERMS.dungeon;
  const dungeonNumber = meta.data?.ch?.chapter_number ?? "";
  const trialXp = meta.data?.ch?.completion_xp ?? 100;
  const trialCoins = meta.data?.ch?.completion_coins ?? 50;

  const completedCount = lectures.filter((l) => completedSet.has(l.id)).length;

  // --- Daily Mission markers -------------------------------------------------
  const questMissionMarker = useMemo(() => {
    const m = (missions.data?.missions ?? []).find(
      (x) => x.code === "watch_lessons" && !x.complete,
    );
    return m ? `${m.label} (${m.progress}/${m.target})` : null;
  }, [missions.data]);

  const trialMissionMarker = useMemo(() => {
    const m = (missions.data?.missions ?? []).find(
      (x) => x.code === "clear_chapter" && !x.complete,
    );
    return m ? `${m.label} (${m.progress}/${m.target})` : null;
  }, [missions.data]);

  // --- Adventure Map nodes ---------------------------------------------------
  const { nodes, focusId } = useMemo(() => {
    const out: AdventureNode[] = [];
    if (lectures.length === 0) return { nodes: out, focusId: null as string | null };

    out.push({
      id: "entrance",
      kind: "entrance",
      state: "completed",
      title: ADVENTURE_TERMS.entrance,
      subtitle: dungeonName,
      disabled: true,
    });

    let currentAssigned = false;
    let current: string | null = null;

    for (const l of lectures) {
      const st = stateById.get(l.id);
      const done = completedSet.has(l.id);
      const unlocked = st ? st.unlocked : l.lecture_number === lectures[0].lecture_number;
      let state: AdventureNode["state"] = done ? "completed" : unlocked ? "available" : "locked";
      if (!done && unlocked && !currentAssigned) {
        state = "current";
        currentAssigned = true;
        current = l.id;
      }
      out.push({
        id: l.id,
        kind: "quest",
        state,
        badge: `${ADVENTURE_TERMS.quest.toUpperCase()} ${String(l.lecture_number).padStart(2, "0")}`,
        title: l.lecture_title,
        subtitle: state === "locked" ? `Clear Quest ${String(st?.prev_lecture_number ?? "").padStart(2, "0")} first` : undefined,
        xp: state === "locked" ? undefined : QUEST_XP,
        missionMarker: state === "current" ? questMissionMarker : null,
        payload: l,
      });
    }

    const trialState: AdventureNode["state"] = trialCleared
      ? "completed"
      : allCompleted
      ? currentAssigned
        ? "available"
        : "current"
      : "locked";
    if (trialState === "current") current = "master-trial";
    out.push({
      id: "master-trial",
      kind: "master_trial",
      state: trialState,
      badge: "FINAL CHALLENGE",
      title: ADVENTURE_TERMS.masterTrial,
      subtitle: trialState === "locked" ? `Clear all ${lectures.length} Quests to unseal` : "Guardian of this Dungeon",
      xp: trialXp,
      coins: trialCoins,
      missionMarker: trialState === "current" || trialState === "available" ? trialMissionMarker : null,
    });

    const chestState: AdventureNode["state"] = trialCleared ? (current ? "available" : "current") : "locked";
    if (chestState === "current") current = "knowledge-chest";
    out.push({
      id: "knowledge-chest",
      kind: "knowledge_chest",
      state: chestState,
      badge: trialCleared ? ADVENTURE_TERMS.dungeonCleared.toUpperCase() : "SEALED",
      title: ADVENTURE_TERMS.knowledgeChest,
      subtitle: trialCleared ? "Open your reward" : `Defeat the ${ADVENTURE_TERMS.masterTrial} to unlock`,
      xp: chapterCompletion.data?.xp_awarded ?? trialXp,
      coins: chapterCompletion.data?.coins_awarded ?? trialCoins,
    });

    return { nodes: out, focusId: lesson ?? current };
  }, [
    lectures, stateById, completedSet, allCompleted, trialCleared, trialXp, trialCoins,
    dungeonName, lesson, questMissionMarker, trialMissionMarker, chapterCompletion.data,
  ]);

  // Deep-link from Continue Learning: open the requested quest automatically.
  useEffect(() => {
    if (!lesson || activeLecture) return;
    const l = lectures.find((x) => x.id === lesson);
    if (!l) return;
    const st = stateById.get(l.id);
    if (st && !st.unlocked) return;
    setActiveLecture({ id: l.id, url: l.youtube_url, title: l.lecture_title, number: l.lecture_number });
    setClaimDone(completedSet.has(l.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson, lectures.length, progress.data]);

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
        haptic(30);
        setFloating({ xp: r.xpAwarded, coins: r.coinsAwarded, label: ADVENTURE_TERMS.quest, key: Date.now() });
        setReward({ ...r, title: `${ADVENTURE_TERMS.quest} cleared!` });
        qc.invalidateQueries({ queryKey: ["video-completions"] });
        qc.invalidateQueries({ queryKey: ["gam-dashboard"] });
        qc.invalidateQueries({ queryKey: ["lecture-progress"] });
        qc.invalidateQueries({ queryKey: ["chapter-completion"] });
        qc.invalidateQueries({ queryKey: ["continue-learning"] });
        qc.invalidateQueries({ queryKey: ["daily-missions"] });
      }
    } catch {
      /* silent */
    } finally {
      setClaiming(false);
    }
  }, [activeLecture, claiming, claimDone, completeFn, qc]);

  const onSelectNode = useCallback(
    (n: AdventureNode) => {
      if (n.kind === "master_trial") {
        if (n.state === "locked") {
          toast.error(`${ADVENTURE_TERMS.masterTrial} sealed`, { description: "Clear every Quest in this Dungeon first." });
          return;
        }
        haptic(20);
        setTrialOpen(true);
        return;
      }
      if (n.kind === "knowledge_chest") {
        if (n.state === "locked") {
          toast.error(`${ADVENTURE_TERMS.knowledgeChest} sealed`, { description: `Finish the ${ADVENTURE_TERMS.masterTrial} to open it.` });
          return;
        }
        haptic([20, 40, 30]);
        setChestOpen(true);
        return;
      }
      if (n.kind === "entrance") return;

      if (n.state === "locked") {
        toast.error(`${ADVENTURE_TERMS.quest} locked`, { description: n.subtitle ?? "Clear the previous Quest first." });
        return;
      }
      const l = n.payload as { id: string; youtube_url: string; lecture_title: string; lecture_number: number };
      setActiveLecture({ id: l.id, url: l.youtube_url, title: l.lecture_title, number: l.lecture_number });
      setClaimReady(false);
      setClaiming(false);
      setClaimDone(completedSet.has(l.id));
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    },
    [completedSet, reduce],
  );

  return (
    <div className="space-y-4">
      <RewardPopup reward={reward} onClose={() => setReward(null)} />
      <FloatingReward reward={floating} />

      <Link
        to="/app/journey/$worldId"
        params={{ worldId }}
        className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to Dungeons
      </Link>

      <AdventureProgressPanel
        dungeonName={dungeonName}
        dungeonNumber={dungeonNumber}
        completed={chAgg?.completed ?? completedCount}
        total={chAgg?.total ?? lectures.length}
        xpEarned={completedCount * QUEST_XP + (chapterCompletion.data?.xp_awarded ?? 0)}
        coinsEarned={chapterCompletion.data?.coins_awarded ?? 0}
        xp={dash.data?.stats.xp ?? 0}
      />

      {activeLecture && (
        <Card className="border-primary/30">
          <CardContent className="p-3 space-y-2">
            <YouTubePlayer url={activeLecture.url} title={activeLecture.title} onComplete={handleVideoEnded} />
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">
                  {ADVENTURE_TERMS.quest} {activeLecture.number}
                </div>
                <div className="font-semibold truncate">{activeLecture.title}</div>
            </div>
            <LectureMaterials lectureId={activeLecture.id} />
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
                  <><Gift className="h-4 w-4 mr-2" /> Claim +{QUEST_XP} XP</>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <AdventureMap nodes={nodes} onSelect={onSelectNode} focusId={focusId} />

      {lectures.length === 0 && !meta.isLoading && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No Quests in this Dungeon yet.
        </p>
      )}

      {/* Master Trial */}
      <Dialog open={trialOpen} onOpenChange={setTrialOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-orbitron">
              {trialCleared ? <Crown className="h-5 w-5 text-amber-400" /> : <Shield className="h-5 w-5 text-rose-400" />}
              {trialCleared ? ADVENTURE_TERMS.dungeonCleared : ADVENTURE_TERMS.masterTrial}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-center py-4">
            <div className="text-6xl">{trialCleared ? "👑" : "🛡️"}</div>
            <div className="font-extrabold text-lg font-orbitron">
              {trialCleared ? `${dungeonName} mastered` : `${dungeonName} — ${ADVENTURE_TERMS.masterTrial}`}
            </div>
            <div className="text-sm text-muted-foreground">
              {trialCleared
                ? "You proved your mastery of every Quest in this Dungeon."
                : `Rewards are granted automatically once every Quest in this Dungeon is cleared.`}
            </div>
            <div className="flex justify-center gap-3 text-sm font-bold">
              <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-400">
                +{chapterCompletion.data?.xp_awarded ?? trialXp} XP
              </span>
              <span className="px-3 py-1 rounded-full bg-yellow-500/15 text-yellow-400 inline-flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" /> +{chapterCompletion.data?.coins_awarded ?? trialCoins}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setTrialOpen(false)} className="w-full">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Knowledge Chest */}
      <Dialog open={chestOpen} onOpenChange={setChestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-orbitron">
              <Gift className="h-5 w-5 text-amber-400" /> {ADVENTURE_TERMS.knowledgeChest}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-center py-4">
            <motion.div
              className="text-6xl"
              initial={reduce ? false : { scale: 0.6, rotate: -8, opacity: 0 }}
              animate={reduce ? undefined : { scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
            >
              🎁
            </motion.div>
            <div className="font-extrabold text-lg font-orbitron">{ADVENTURE_TERMS.dungeonCleared}</div>
            <div className="text-sm text-muted-foreground">
              {dungeonName} is complete. Your knowledge grows stronger.
            </div>
            <div className="flex justify-center gap-3 text-sm font-bold">
              <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-400">
                +{chapterCompletion.data?.xp_awarded ?? trialXp} XP
              </span>
              <span className="px-3 py-1 rounded-full bg-yellow-500/15 text-yellow-400 inline-flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" /> +{chapterCompletion.data?.coins_awarded ?? trialCoins}
              </span>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button asChild className="w-full">
              <Link to="/app/journey/$worldId" params={{ worldId }}>Choose your next Dungeon</Link>
            </Button>
            <Button variant="ghost" onClick={() => setChestOpen(false)} className="w-full">Stay here</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
