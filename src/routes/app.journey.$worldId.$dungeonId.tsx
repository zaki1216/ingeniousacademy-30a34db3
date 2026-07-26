import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useMemo, useState } from "react";
import {
  ChevronLeft, CheckCircle2, Loader2, Gift, Coins, Skull, Crown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { YouTubePlayer } from "@/components/gamification/YouTubePlayer";
import { RewardPopup, type RewardPayload } from "@/components/gamification/RewardPopup";
import { FloatingReward, type FloatingRewardPayload } from "@/components/rpg/FloatingReward";
import { DungeonPath } from "@/components/rpg/DungeonPath";
import { completeVideo } from "@/lib/api/gamification.functions";
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

  const allCompleted = !!chAgg && chAgg.total > 0 && chAgg.completed === chAgg.total;
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
        qc.invalidateQueries({ queryKey: ["lecture-progress"] });
        qc.invalidateQueries({ queryKey: ["chapter-completion"] });
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
        toast.error("Quest locked", { description: `Finish Quest ${prevNum ?? ""} first.` });
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
              <span className="font-semibold">{chAgg.completed} / {chAgg.total} Quests cleared</span>
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
          </CardContent>
        </Card>
      )}

      <DungeonPath
        lectures={lectures}
        stateById={stateById}
        completedSet={completedSet}
        onSelect={(l, locked, prevNum) =>
          openLecture(
            { id: l.id, url: l.youtube_url, title: l.lecture_title, number: l.lecture_number },
            locked,
            prevNum,
          )
        }
        bossReady={allCompleted}
        bossDefeated={bossDefeated}
        bossXp={bossXp}
        bossCoins={bossCoins}
        bossAwardedXp={chapterCompletion.data?.xp_awarded ?? null}
        bossAwardedCoins={chapterCompletion.data?.coins_awarded ?? null}
        totalQuests={chAgg?.total ?? lectures.length}
        onBossClick={() => setBossOpen(true)}
      />
      {lectures.length === 0 && !meta.isLoading && (
        <p className="text-sm text-muted-foreground text-center py-8">No quests in this dungeon yet.</p>
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
                : "Boss rewards are granted automatically when you complete every quest in this dungeon."}
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
