/**
 * Shared data hook powering every academic building.
 *
 * Given a BuildingCurriculum config, returns the fully-resolved runtime data
 * the generic Building Engine needs: wings, dungeons for the active wing,
 * a recommended objective, stats, and progress metadata.
 *
 * No component that consumes this hook should know anything about the
 * specific subject / wing / chapter names — everything derives from config.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { getLectureProgress } from "@/lib/api/lecture-progression.functions";
import { resolveWings } from "@/lib/curriculum";
import type { BuildingCurriculum, WingDef } from "@/lib/curriculum/types";
import type { BuildingObjective } from "@/components/building/BuildingObjectiveBar";
import type { WingOption } from "@/components/building/WingChooser";

export interface EngineDungeon {
  id: string;
  subjectId: string;
  name: string;
  number: number;
  total: number;
  passed: number;
  pct: number;
  bossCleared: boolean;
  unlocked: boolean;
  difficulty: number;
  rewardXp: number;
  rewardCoins: number;
  nextQuest: number | null;
}

export interface EngineStats {
  totalDungeons: number;
  cleared: number;
  totalQuests: number;
  passedQuests: number;
  pct: number;
  recommended: EngineDungeon | null;
}

export interface ResolvedWing extends WingDef {
  chapters: Array<{ id: string; chapter_name: string; chapter_number: number; subject_id: string }>;
  subject?: { id: string; subject_name: string };
}

export interface UseBuildingDataResult {
  cadetName: string;
  wings: ResolvedWing[];
  wingOptions: WingOption[];
  selectedWingId: string | null;
  selectWing: (id: string) => void;
  clearWing: () => void;
  activeWing: ResolvedWing | null;
  /** Display title for the current interior. Falls back to building.title. */
  interiorTitle: string;
  dungeons: EngineDungeon[];
  recommended: BuildingObjective | null;
  stats: EngineStats;
  hasSubjects: boolean;
  isLoading: boolean;
}

export function useBuildingData(building: BuildingCurriculum): UseBuildingDataResult {
  const { user } = useAuth();
  const progressFn = useServerFn(getLectureProgress);
  const [selectedWingId, setSelectedWingId] = useState<string | null>(null);

  const profile = useQuery({
    queryKey: ["building-profile", building.id, user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase
        .from("profiles")
        .select("name, standard_id")
        .eq("id", user!.id)
        .maybeSingle()).data,
    staleTime: 60_000,
  });

  const standardId = profile.data?.standard_id;

  const subjects = useQuery({
    queryKey: ["building-subjects", building.id, standardId],
    enabled: !!standardId,
    queryFn: async () => {
      const list =
        (await supabase
          .from("subjects")
          .select("id, subject_name")
          .eq("standard_id", standardId!)).data ?? [];
      return list.filter((s) =>
        building.subjectMatcher({ subject_name: s.subject_name ?? "" }),
      );
    },
    staleTime: 60_000,
  });

  const matchedSubjects = useMemo(
    () => (subjects.data ?? []).map((s) => ({ id: s.id, subject_name: s.subject_name ?? "" })),
    [subjects.data],
  );

  const world = useQuery({
    queryKey: [
      "building-world",
      building.id,
      matchedSubjects.map((s) => s.id).join(","),
      user?.id,
    ],
    enabled: !!user?.id && matchedSubjects.length > 0,
    queryFn: async () => {
      const chs =
        (await supabase
          .from("chapters")
          .select("id, chapter_name, chapter_number, subject_id, completion_xp, completion_coins")
          .in("subject_id", matchedSubjects.map((s) => s.id))
          .order("chapter_number")).data ?? [];
      const chapterCompletions =
        (await supabase
          .from("chapter_completions")
          .select("chapter_id")
          .eq("user_id", user!.id)).data ?? [];
      return { chs, chapterCompletions };
    },
  });

  const progress = useQuery({
    queryKey: ["building-lecture-progress", user?.id],
    enabled: !!user?.id,
    queryFn: () => progressFn(),
  });

  const chapters = useMemo(
    () =>
      (world.data?.chs ?? []).map((c) => ({
        ...c,
        chapter_name: c.chapter_name ?? "",
      })),
    [world.data],
  );

  const wings = useMemo<ResolvedWing[]>(
    () => resolveWings(building, matchedSubjects, chapters) as ResolvedWing[],
    [building, matchedSubjects, chapters],
  );

  const activeWing = useMemo(
    () => wings.find((w) => w.id === selectedWingId) ?? null,
    [wings, selectedWingId],
  );

  const dungeons = useMemo<EngineDungeon[]>(() => {
    if (!activeWing) return [];
    const doneChs = new Set(
      (world.data?.chapterCompletions ?? []).map((c) => c.chapter_id),
    );
    const aggMap = new Map(
      (progress.data?.chapters ?? []).map((c) => [c.chapter_id, c]),
    );
    const chs = activeWing.chapters;
    return chs.map((c, i) => {
      const agg = aggMap.get(c.id);
      const total = agg?.total ?? 0;
      const passed = agg?.passed ?? 0;
      const pct = agg?.percent ?? 0;
      const bossCleared = doneChs.has(c.id);
      const prevBossCleared = i === 0 ? true : doneChs.has(chs[i - 1].id);
      const anyStarted = passed > 0;
      const unlocked = i === 0 || prevBossCleared || anyStarted;
      const difficulty = Math.min(3, Math.floor(i / 2));
      const full = chapters.find((cc) => cc.id === c.id);
      return {
        id: c.id,
        subjectId: c.subject_id,
        name: c.chapter_name,
        number: c.chapter_number,
        total,
        passed,
        pct,
        bossCleared,
        unlocked,
        difficulty,
        rewardXp: full?.completion_xp ?? 100,
        rewardCoins: full?.completion_coins ?? 20,
        nextQuest: agg?.next_to_unlock?.lecture_number ?? null,
      };
    });
  }, [activeWing, world.data, progress.data, chapters]);

  const stats = useMemo<EngineStats>(() => {
    const totalDungeons = dungeons.length;
    const cleared = dungeons.filter((d) => d.bossCleared).length;
    const totalQuests = dungeons.reduce((s, d) => s + d.total, 0);
    const passedQuests = dungeons.reduce((s, d) => s + d.passed, 0);
    const pct = totalQuests > 0 ? Math.round((passedQuests / totalQuests) * 100) : 0;
    const recommended =
      dungeons.find((d) => d.unlocked && !d.bossCleared && d.nextQuest !== null) ??
      dungeons.find((d) => d.unlocked && !d.bossCleared) ??
      null;
    return { totalDungeons, cleared, totalQuests, passedQuests, pct, recommended };
  }, [dungeons]);

  const recommended = useMemo<BuildingObjective | null>(() => {
    const cand = stats.recommended;
    if (!cand) return null;
    return {
      id: cand.id,
      subjectId: cand.subjectId,
      name: cand.name,
      nextQuest: cand.nextQuest,
      bossReady: cand.total > 0 && cand.passed >= cand.total,
    };
  }, [stats]);

  const wingOptions = useMemo<WingOption[]>(
    () =>
      wings.map((w) => ({
        id: w.id,
        name: w.subject?.subject_name ?? w.name,
        tag: w.tag,
        emoji: w.emoji,
        description: w.description,
        gradient: w.gradient,
        glow: w.glow,
        count: w.chapters.length,
        onEnter: () => setSelectedWingId(w.id),
      })),
    [wings],
  );

  const interiorTitle = useMemo(() => {
    if (!activeWing) return building.title;
    return activeWing.subject?.subject_name ?? activeWing.name;
  }, [activeWing, building.title]);

  return {
    cadetName: profile.data?.name ?? "Cadet",
    wings,
    wingOptions,
    selectedWingId,
    selectWing: setSelectedWingId,
    clearWing: () => setSelectedWingId(null),
    activeWing,
    interiorTitle,
    dungeons,
    recommended,
    stats,
    hasSubjects: matchedSubjects.length > 0,
    isLoading: profile.isLoading || subjects.isLoading || world.isLoading,
  };
}
