import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DoorOpen, ChevronRight, Lock, Coins, Star, Crown } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { getLectureProgress } from "@/lib/api/lecture-progression.functions";
import { WingChooser } from "@/components/building/WingChooser";
import { BuildingObjectiveBar, type BuildingObjective } from "@/components/building/BuildingObjectiveBar";
import { splitScienceChapters } from "@/lib/building/wings";


export const Route = createFileRoute("/app/building/science")({
  component: ScienceBuildingInterior,
  head: () => ({
    meta: [
      { title: "Science Laboratory — Ingenious Academy" },
      { name: "description", content: "Enter the Alchemy Wing of Ingenious Academy. Choose your laboratory." },
    ],
  }),
});

function useScienceData() {
  const { user } = useAuth();
  const progressFn = useServerFn(getLectureProgress);

  const profile = useQuery({
    queryKey: ["science-building-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase.from("profiles").select("standard_id").eq("id", user!.id).maybeSingle()).data,
    staleTime: 60_000,
  });

  const standardId = profile.data?.standard_id;

  const subjects = useQuery({
    queryKey: ["science-subjects", standardId],
    enabled: !!standardId,
    queryFn: async () => {
      const list = (await supabase.from("subjects").select("id, subject_name").eq("standard_id", standardId!)).data ?? [];
      return list.filter((s) => /science|physic|chem|bio/i.test(s.subject_name ?? ""));
    },
    staleTime: 60_000,
  });

  const scienceSubjects = subjects.data ?? [];

  const world = useQuery({
    queryKey: ["science-world", scienceSubjects.map((s) => s.id).join(","), user?.id],
    enabled: !!user?.id && scienceSubjects.length > 0,
    queryFn: async () => {
      const chs =
        (await supabase
          .from("chapters")
          .select("id, chapter_name, chapter_number, subject_id, completion_xp, completion_coins")
          .in("subject_id", scienceSubjects.map((s) => s.id))
          .order("chapter_number")).data ?? [];
      const chapterCompletions = (await supabase.from("chapter_completions").select("chapter_id").eq("user_id", user!.id)).data ?? [];
      return { chs, chapterCompletions };
    },
  });

  const progress = useQuery({
    queryKey: ["science-lecture-progress", user?.id],
    enabled: !!user?.id,
    queryFn: () => progressFn(),
  });

  return { scienceSubjects, world: world.data, progress: progress.data };
}

function ScienceBuildingInterior() {
  const navigate = useNavigate();
  const { scienceSubjects, world, progress } = useScienceData();
  const [wing, setWing] = useState<"sci01" | "sci02" | null>(null);

  // Determine wing structure: prefer subject split when 2 science subjects exist.
  const twoSubjectSplit =
    scienceSubjects.length >= 2
      ? {
          sci01: scienceSubjects[0],
          sci02: scienceSubjects[1],
        }
      : null;

  const chapters = world?.chs ?? [];

  const { sci01Chs, sci02Chs } = useMemo(() => {
    if (twoSubjectSplit) {
      return {
        sci01Chs: chapters.filter((c) => c.subject_id === twoSubjectSplit.sci01.id),
        sci02Chs: chapters.filter((c) => c.subject_id === twoSubjectSplit.sci02.id),
      };
    }
    const { sci01, sci02 } = splitScienceChapters(chapters);
    return { sci01Chs: sci01, sci02Chs: sci02 };
  }, [chapters, twoSubjectSplit]);

  const activeChs = wing === "sci02" ? sci02Chs : wing === "sci01" ? sci01Chs : [];

  const dungeons = useMemo(() => {
    const doneChs = new Set((world?.chapterCompletions ?? []).map((c) => c.chapter_id));
    const aggMap = new Map((progress?.chapters ?? []).map((c) => [c.chapter_id, c]));
    return activeChs.map((c, i) => {
      const agg = aggMap.get(c.id);
      const total = agg?.total ?? 0;
      const passed = agg?.passed ?? 0;
      const pct = agg?.percent ?? 0;
      const bossCleared = doneChs.has(c.id);
      const prevBossCleared = i === 0 ? true : doneChs.has(activeChs[i - 1].id);
      const anyStarted = passed > 0;
      const unlocked = i === 0 || prevBossCleared || anyStarted;
      return {
        id: c.id,
        subjectId: c.subject_id,
        name: c.chapter_name,
        number: c.chapter_number,
        total, passed, pct, bossCleared, unlocked,
        rewardXp: c.completion_xp ?? 100,
        rewardCoins: c.completion_coins ?? 20,
        nextQuest: agg?.next_to_unlock?.lecture_number ?? null,
      };
    });
  }, [activeChs, world, progress]);

  const recommended = useMemo<BuildingObjective | null>(() => {
    const cand =
      dungeons.find((d) => d.unlocked && !d.bossCleared && d.nextQuest !== null) ??
      dungeons.find((d) => d.unlocked && !d.bossCleared) ??
      null;
    if (!cand) return null;
    return {
      id: cand.id,
      subjectId: cand.subjectId,
      name: cand.name,
      nextQuest: cand.nextQuest,
      bossReady: cand.total > 0 && cand.passed >= cand.total,
    };
  }, [dungeons]);


  function exitBuilding() {
    if (wing) {
      setWing(null);
      return;
    }
    navigate({ to: "/app" });
  }

  function enterDungeon(subjectId: string, id: string) {
    navigate({ to: "/app/journey/$worldId/$dungeonId", params: { worldId: subjectId, dungeonId: id } });
  }

  if (!wing) {
    return (
      <WingChooser
        title="Science Laboratory"
        subtitle="The Alchemy Wing — choose your laboratory to begin experimentation."
        onExit={exitBuilding}
        wings={[
          {
            id: "sci01",
            name: twoSubjectSplit?.sci01.subject_name ?? "Science 01 Laboratory",
            tag: "First Laboratory",
            emoji: "🧪",
            description: "Foundational experiments and elemental studies.",
            gradient: "linear-gradient(135deg,#065f46,#0f766e,#134e4a)",
            glow: "rgba(52,211,153,0.5)",
            count: sci01Chs.length,
            onEnter: () => setWing("sci01"),
          },
          {
            id: "sci02",
            name: twoSubjectSplit?.sci02.subject_name ?? "Science 02 Laboratory",
            tag: "Second Laboratory",
            emoji: "⚗️",
            description: "Advanced reactions, forces and living systems.",
            gradient: "linear-gradient(135deg,#3b0764,#7c3aed,#4c1d95)",
            glow: "rgba(167,139,250,0.5)",
            count: sci02Chs.length,
            onEnter: () => setWing("sci02"),
          },
        ]}
      />
    );
  }

  return <LabInterior title={wing === "sci01" ? (twoSubjectSplit?.sci01.subject_name ?? "Science 01") : (twoSubjectSplit?.sci02.subject_name ?? "Science 02")} dungeons={dungeons} onExit={exitBuilding} onEnter={enterDungeon} />;
}

/* -------------------- Shared lab / hall interior view -------------------- */

export function LabInterior({
  title,
  dungeons,
  onExit,
  onEnter,
}: {
  title: string;
  dungeons: Array<{
    id: string; subjectId: string; name: string; number: number;
    total: number; passed: number; pct: number; bossCleared: boolean; unlocked: boolean;
    rewardXp: number; rewardCoins: number;
  }>;
  onExit: () => void;
  onEnter: (subjectId: string, id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#050a08]">
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 20%, #0f3d2e 0%, #071a12 55%, #020606 100%)",
        }}
      />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-emerald-300/60"
            style={{
              left: `${(i * 47) % 100}%`,
              top: `${(i * 29) % 100}%`,
              boxShadow: "0 0 6px rgba(52,211,153,0.6)",
            }}
            animate={{ y: [0, -40, 0], opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: 6 + (i % 5), repeat: Infinity, delay: (i % 8) * 0.4 }}
          />
        ))}
      </div>

      <div className="relative min-h-screen flex flex-col p-4 sm:p-6 md:p-10">
        <div className="flex items-start justify-between gap-3">
          <button
            onClick={onExit}
            className="flex items-center gap-2 rounded-full pl-2 pr-3 sm:pr-4 py-1.5 border border-emerald-400/30 bg-black/60 backdrop-blur-md text-emerald-100 hover:border-emerald-400/70"
          >
            <span className="h-6 w-6 sm:h-7 sm:w-7 rounded-full grid place-items-center bg-emerald-500/20 border border-emerald-400/40">
              <DoorOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase font-serif">Back</span>
          </button>
        </div>

        <div className="text-center mt-6 sm:mt-10 max-w-2xl mx-auto">
          <div className="text-[10px] sm:text-xs uppercase tracking-[0.4em] text-emerald-300 font-bold">Laboratory</div>
          <h1
            className="mt-2 font-serif text-2xl sm:text-4xl font-black text-emerald-50"
            style={{ fontFamily: "'Cinzel', serif", textShadow: "0 4px 30px rgba(52,211,153,0.35)" }}
          >
            {title}
          </h1>
        </div>

        <div className="mt-8 max-w-5xl w-full mx-auto grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pb-24">
          {dungeons.map((d, i) => (
            <DungeonCard key={d.id} d={d} index={i} onEnter={() => onEnter(d.subjectId, d.id)} accent="emerald" />
          ))}
          {dungeons.length === 0 && (
            <div className="col-span-full text-center text-emerald-100/60 text-sm py-16">
              No dungeons prepared in this laboratory yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DungeonCard({
  d,
  index,
  onEnter,
  accent,
}: {
  d: {
    id: string; name: string; number: number;
    total: number; passed: number; pct: number; bossCleared: boolean; unlocked: boolean;
    rewardXp: number; rewardCoins: number;
  };
  index: number;
  onEnter: () => void;
  accent: "emerald" | "amber" | "sky";
}) {
  const locked = !d.unlocked;
  const accentClass = {
    emerald: { bg: "from-emerald-500 to-teal-800", glow: "rgba(52,211,153,0.5)", txt: "text-emerald-200" },
    amber: { bg: "from-amber-500 to-orange-800", glow: "rgba(251,191,36,0.5)", txt: "text-amber-200" },
    sky: { bg: "from-sky-500 to-indigo-800", glow: "rgba(56,189,248,0.5)", txt: "text-sky-200" },
  }[accent];
  return (
    <motion.button
      type="button"
      disabled={locked}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={locked ? {} : { y: -3, scale: 1.02 }}
      onClick={onEnter}
      className="text-left rounded-2xl overflow-hidden border border-white/10 disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: "linear-gradient(160deg, rgba(15,25,20,0.9), rgba(5,10,8,0.95))",
        boxShadow: `0 15px 40px -15px ${accentClass.glow}`,
      }}
    >
      <div className={`h-24 sm:h-28 bg-gradient-to-br ${accentClass.bg} grid place-items-center relative`}>
        <div className="text-3xl sm:text-4xl font-black text-white/90 font-serif" style={{ textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
          {String(d.number).padStart(2, "0")}
        </div>
        {d.bossCleared && (
          <div className="absolute top-2 right-2 h-6 px-2 rounded-full bg-black/40 border border-white/30 flex items-center gap-1 text-[9px] font-black text-white">
            <Crown className="h-3 w-3" /> CLEARED
          </div>
        )}
        {locked && (
          <div className="absolute inset-0 bg-black/60 grid place-items-center">
            <Lock className="h-6 w-6 text-white/80" />
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <div className={`text-[9px] uppercase tracking-widest font-bold ${accentClass.txt}`}>Dungeon {String(d.number).padStart(2, "0")}</div>
        <div className="font-serif text-base sm:text-lg font-black text-white truncate mt-0.5">{d.name}</div>
        <div className="mt-2 h-1.5 rounded-full bg-black/50 overflow-hidden">
          <div className={`h-full bg-gradient-to-r ${accentClass.bg}`} style={{ width: `${d.pct}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-white/80">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1"><Coins className="h-3 w-3" /> {d.rewardCoins}</span>
            <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" /> {d.rewardXp}</span>
          </div>
          <span className={`inline-flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider ${accentClass.txt}`}>
            {locked ? "Sealed" : "Enter"} <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </motion.button>
  );
}
