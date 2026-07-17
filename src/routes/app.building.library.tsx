import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DoorOpen } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { getLectureProgress } from "@/lib/api/lecture-progression.functions";
import { WingChooser, type WingOption } from "@/components/building/WingChooser";
import { BuildingObjectiveBar, type BuildingObjective } from "@/components/building/BuildingObjectiveBar";
import { isLanguageSubject, languageOf } from "@/lib/building/wings";
import { DungeonCard } from "@/routes/app.building.science";


export const Route = createFileRoute("/app/building/library")({
  component: LibraryBuildingInterior,
  head: () => ({
    meta: [
      { title: "Language Library — Ingenious Academy" },
      { name: "description", content: "Enter the Scriptorium of Ingenious Academy. Choose your language hall." },
    ],
  }),
});

const HALL_STYLES: Record<string, { emoji: string; gradient: string; glow: string; tag: string }> = {
  english:  { emoji: "📖", gradient: "linear-gradient(135deg,#7c2d12,#b45309,#78350f)",  glow: "rgba(251,191,36,0.5)", tag: "English Hall" },
  hindi:    { emoji: "📖", gradient: "linear-gradient(135deg,#7f1d1d,#c2410c,#7c2d12)",  glow: "rgba(248,113,113,0.5)", tag: "Hindi Hall" },
  marathi:  { emoji: "📖", gradient: "linear-gradient(135deg,#134e4a,#0f766e,#065f46)",  glow: "rgba(45,212,191,0.5)", tag: "Marathi Hall" },
  urdu:     { emoji: "📖", gradient: "linear-gradient(135deg,#3b0764,#6d28d9,#4c1d95)",  glow: "rgba(167,139,250,0.5)", tag: "Urdu Hall" },
  sanskrit: { emoji: "📖", gradient: "linear-gradient(135deg,#78350f,#f59e0b,#b45309)",  glow: "rgba(253,224,71,0.5)", tag: "Sanskrit Hall" },
};

function styleFor(name: string) {
  const key = name.toLowerCase();
  return HALL_STYLES[key] ?? {
    emoji: "📖",
    gradient: "linear-gradient(135deg,#334155,#475569,#1e293b)",
    glow: "rgba(148,163,184,0.5)",
    tag: `${name} Hall`,
  };
}

function LibraryBuildingInterior() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const progressFn = useServerFn(getLectureProgress);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const profile = useQuery({
    queryKey: ["library-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase.from("profiles").select("standard_id").eq("id", user!.id).maybeSingle()).data,
    staleTime: 60_000,
  });

  const standardId = profile.data?.standard_id;

  const subjects = useQuery({
    queryKey: ["library-subjects", standardId],
    enabled: !!standardId,
    queryFn: async () => {
      const list = (await supabase.from("subjects").select("id, subject_name").eq("standard_id", standardId!)).data ?? [];
      return list.filter((s) => isLanguageSubject(s.subject_name ?? ""));
    },
    staleTime: 60_000,
  });

  const languageSubjects = subjects.data ?? [];

  const chapters = useQuery({
    queryKey: ["library-chapters", selectedSubjectId, user?.id],
    enabled: !!selectedSubjectId && !!user?.id,
    queryFn: async () => {
      const chs =
        (await supabase
          .from("chapters")
          .select("id, chapter_name, chapter_number, subject_id, completion_xp, completion_coins")
          .eq("subject_id", selectedSubjectId!)
          .order("chapter_number")).data ?? [];
      const chapterCompletions = (await supabase.from("chapter_completions").select("chapter_id").eq("user_id", user!.id)).data ?? [];
      return { chs, chapterCompletions };
    },
  });

  const progress = useQuery({
    queryKey: ["library-lecture-progress", user?.id],
    enabled: !!user?.id,
    queryFn: () => progressFn(),
  });

  const dungeons = useMemo(() => {
    const chs = chapters.data?.chs ?? [];
    const doneChs = new Set((chapters.data?.chapterCompletions ?? []).map((c) => c.chapter_id));
    const aggMap = new Map((progress.data?.chapters ?? []).map((c) => [c.chapter_id, c]));
    return chs.map((c, i) => {
      const agg = aggMap.get(c.id);
      const total = agg?.total ?? 0;
      const passed = agg?.passed ?? 0;
      const pct = agg?.percent ?? 0;
      const bossCleared = doneChs.has(c.id);
      const prevBossCleared = i === 0 ? true : doneChs.has(chs[i - 1].id);
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
  }, [chapters.data, progress.data]);

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
    if (selectedSubjectId) {
      setSelectedSubjectId(null);
      return;
    }
    navigate({ to: "/app" });
  }

  if (!selectedSubjectId) {
    const wings: WingOption[] = languageSubjects.map((s) => {
      const lang = languageOf(s.subject_name ?? "");
      const style = styleFor(lang);
      return {
        id: s.id,
        name: `${lang} Hall`,
        tag: style.tag,
        emoji: style.emoji,
        description: `Enter the ${lang} scriptorium — quests of grammar, verse and story.`,
        gradient: style.gradient,
        glow: style.glow,
        onEnter: () => setSelectedSubjectId(s.id),
      };
    });

    return (
      <WingChooser
        title="Language Library"
        subtitle="The Scriptorium — every tongue has its own hall. Choose one to begin."
        onExit={exitBuilding}
        wings={
          wings.length
            ? wings
            : [
                {
                  id: "empty",
                  name: "No Halls Yet",
                  tag: "Awaiting",
                  emoji: "🕯️",
                  description: "Language subjects will appear here once configured for your class.",
                  gradient: "linear-gradient(135deg,#334155,#0f172a)",
                  glow: "rgba(148,163,184,0.3)",
                  locked: true,
                  onEnter: () => {},
                },
              ]
        }
      />
    );
  }

  const subj = languageSubjects.find((s) => s.id === selectedSubjectId);
  const title = subj ? `${languageOf(subj.subject_name ?? "")} Hall` : "Language Hall";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0a0604]">
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 20%, #3d2a1a 0%, #1a1108 55%, #050301 100%)",
        }}
      />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-amber-200/60"
            style={{
              left: `${(i * 41) % 100}%`,
              top: `${(i * 27) % 100}%`,
              boxShadow: "0 0 6px rgba(251,191,36,0.6)",
            }}
            animate={{ y: [0, -40, 0], opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: 6 + (i % 5), repeat: Infinity, delay: (i % 8) * 0.4 }}
          />
        ))}
      </div>

      <div className="relative min-h-screen flex flex-col p-4 sm:p-6 md:p-10">
        <div className="flex items-start justify-between gap-3">
          <button
            onClick={exitBuilding}
            className="flex items-center gap-2 rounded-full pl-2 pr-3 sm:pr-4 py-1.5 border border-amber-400/30 bg-black/60 backdrop-blur-md text-amber-100 hover:border-amber-400/70"
          >
            <span className="h-6 w-6 sm:h-7 sm:w-7 rounded-full grid place-items-center bg-amber-500/20 border border-amber-400/40">
              <DoorOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase font-serif">Back</span>
          </button>
        </div>

        <div className="text-center mt-6 sm:mt-10 max-w-2xl mx-auto">
          <div className="text-[10px] sm:text-xs uppercase tracking-[0.4em] text-amber-300 font-bold">Scriptorium</div>
          <h1
            className="mt-2 font-serif text-2xl sm:text-4xl font-black text-amber-50"
            style={{ fontFamily: "'Cinzel', serif", textShadow: "0 4px 30px rgba(251,191,36,0.45)" }}
          >
            {title}
          </h1>
        </div>

        <div className="mt-8 max-w-5xl w-full mx-auto grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pb-24">
          {dungeons.map((d, i) => (
            <DungeonCard
              key={d.id}
              d={d}
              index={i}
              onEnter={() =>
                navigate({ to: "/app/journey/$worldId/$dungeonId", params: { worldId: d.subjectId, dungeonId: d.id } })
              }
              accent="amber"
            />
          ))}
          {dungeons.length === 0 && (
            <div className="col-span-full text-center text-amber-100/60 text-sm py-16">
              This hall's tomes are being prepared.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
