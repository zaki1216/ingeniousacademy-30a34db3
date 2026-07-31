/**
 * Continue Learning Engine + Daily Mission system.
 *
 * Pure additive layer over the existing curriculum / progress tables:
 *   subjects → chapters → lectures → video_completions / chapter_completions
 *
 * No schema changes. Mission claims are made idempotent by tagging the
 * existing xp_transactions / coin_transactions rows with
 * reason = "daily_mission" and metadata { code, day }.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { levelFromXp } from "@/lib/gamification/leveling";
import { MINUTES_PER_LESSON, MISSION_DEFS, type MissionCode } from "@/lib/learning/missions";

export type ContinueTarget = {
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterName: string;
  chapterNumber: number;
  lectureId: string | null;
  lectureTitle: string | null;
  lectureNumber: number | null;
  nextLectureTitle: string | null;
  nextLectureNumber: number | null;
  chapterPercent: number;
  chapterDone: number;
  chapterTotal: number;
  subjectPercent: number;
  remainingLessons: number;
  estimatedMinutes: number;
  /** true when the chapter's lessons are all done and only the Guardian reward remains */
  guardianReady: boolean;
};

export type ContinueLearningResult = {
  status: "resume" | "start" | "all_complete" | "no_content";
  target: ContinueTarget | null;
  overall: { total: number; done: number; percent: number };
  /** revision / alternate subject suggestion when everything is finished */
  suggestion: { subjectId: string; subjectName: string } | null;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function loadCurriculum(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("standard_id, name")
    .eq("id", userId)
    .maybeSingle();

  const standardId = profile?.standard_id ?? null;
  if (!standardId) return null;

  const { data: subjects } = await supabaseAdmin
    .from("subjects")
    .select("id, subject_name, created_at")
    .eq("standard_id", standardId)
    .order("created_at", { ascending: true });

  const subjectIds = (subjects ?? []).map((s) => s.id);
  if (subjectIds.length === 0) return { profile, subjects: [], chapters: [], lectures: [], done: new Set<string>(), chapterDone: new Set<string>() };

  const { data: chapters } = await supabaseAdmin
    .from("chapters")
    .select("id, chapter_name, chapter_number, subject_id")
    .in("subject_id", subjectIds)
    .order("chapter_number", { ascending: true });

  const chapterIds = (chapters ?? []).map((c) => c.id);
  const { data: lectures } = chapterIds.length
    ? await supabaseAdmin
        .from("lectures")
        .select("id, lecture_title, lecture_number, chapter_id")
        .in("chapter_id", chapterIds)
        .order("lecture_number", { ascending: true })
    : { data: [] as { id: string; lecture_title: string; lecture_number: number; chapter_id: string }[] };

  const { data: completions } = await supabaseAdmin
    .from("video_completions")
    .select("lecture_id")
    .eq("user_id", userId);
  const { data: chapterCompletions } = await supabaseAdmin
    .from("chapter_completions")
    .select("chapter_id")
    .eq("user_id", userId);

  return {
    profile,
    subjects: subjects ?? [],
    chapters: chapters ?? [],
    lectures: lectures ?? [],
    done: new Set((completions ?? []).map((c) => c.lecture_id)),
    chapterDone: new Set((chapterCompletions ?? []).map((c) => c.chapter_id)),
  };
}

export const getContinueLearning = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ContinueLearningResult> => {
    const data = await loadCurriculum(context.userId);
    const empty: ContinueLearningResult = {
      status: "no_content",
      target: null,
      overall: { total: 0, done: 0, percent: 0 },
      suggestion: null,
    };
    if (!data) return empty;

    const { subjects, chapters, lectures, done } = data;
    const total = lectures.length;
    const doneCount = lectures.filter((l) => done.has(l.id)).length;
    const overall = {
      total,
      done: doneCount,
      percent: total > 0 ? Math.round((doneCount / total) * 100) : 0,
    };
    if (total === 0) return { ...empty, overall };

    const lecturesOf = (chapterId: string) =>
      lectures.filter((l) => l.chapter_id === chapterId).sort((a, b) => a.lecture_number - b.lecture_number);

    type Candidate = {
      subject: (typeof subjects)[number];
      chapter: (typeof chapters)[number];
      lecs: typeof lectures;
      started: boolean;
    };

    const candidates: Candidate[] = [];
    for (const s of subjects) {
      const subChapters = chapters
        .filter((c) => c.subject_id === s.id)
        .sort((a, b) => a.chapter_number - b.chapter_number);
      for (const c of subChapters) {
        const lecs = lecturesOf(c.id);
        if (lecs.length === 0) continue;
        const allDone = lecs.every((l) => done.has(l.id));
        if (allDone) continue;
        candidates.push({ subject: s, chapter: c, lecs, started: lecs.some((l) => done.has(l.id)) });
      }
    }

    if (candidates.length === 0) {
      const suggestion = subjects[0] ? { subjectId: subjects[0].id, subjectName: subjects[0].subject_name } : null;
      return { status: "all_complete", target: null, overall, suggestion };
    }

    // Prefer a chapter already in progress, otherwise the earliest unfinished one.
    const pick = candidates.find((c) => c.started) ?? candidates[0];
    const { subject, chapter, lecs } = pick;

    const chapterDoneCount = lecs.filter((l) => done.has(l.id)).length;
    const current = lecs.find((l) => !done.has(l.id)) ?? null;
    const currentIdx = current ? lecs.findIndex((l) => l.id === current.id) : -1;
    const next = currentIdx >= 0 ? lecs[currentIdx + 1] ?? null : null;

    const subChapterIds = chapters.filter((c) => c.subject_id === subject.id).map((c) => c.id);
    const subLectures = lectures.filter((l) => subChapterIds.includes(l.chapter_id));
    const subDone = subLectures.filter((l) => done.has(l.id)).length;

    const remainingLessons = lecs.length - chapterDoneCount;

    return {
      status: doneCount === 0 ? "start" : "resume",
      overall,
      suggestion: null,
      target: {
        subjectId: subject.id,
        subjectName: subject.subject_name,
        chapterId: chapter.id,
        chapterName: chapter.chapter_name,
        chapterNumber: chapter.chapter_number,
        lectureId: current?.id ?? null,
        lectureTitle: current?.lecture_title ?? null,
        lectureNumber: current?.lecture_number ?? null,
        nextLectureTitle: next?.lecture_title ?? null,
        nextLectureNumber: next?.lecture_number ?? null,
        chapterDone: chapterDoneCount,
        chapterTotal: lecs.length,
        chapterPercent: lecs.length ? Math.round((chapterDoneCount / lecs.length) * 100) : 0,
        subjectPercent: subLectures.length ? Math.round((subDone / subLectures.length) * 100) : 0,
        remainingLessons,
        estimatedMinutes: remainingLessons * MINUTES_PER_LESSON,
        guardianReady: remainingLessons === 0,
      },
    };
  });

/* ------------------------------ Daily missions ----------------------------- */

export type DailyMission = {
  code: MissionCode;
  label: string;
  description: string;
  icon: string;
  target: number;
  progress: number;
  complete: boolean;
  claimed: boolean;
  xp: number;
  coins: number;
};

export type DailyMissionsResult = {
  day: string;
  missions: DailyMission[];
  completed: number;
  total: number;
  streakDays: number;
};

async function computeMissionState(userId: string): Promise<DailyMissionsResult> {
  const day = todayISO();
  const dayStart = `${day}T00:00:00.000Z`;

  const [statsRes, lessonsRes, chaptersRes, xpRes, claimsRes, curriculum] = await Promise.all([
    supabaseAdmin.from("gamification_stats").select("streak_days, last_active_date").eq("user_id", userId).maybeSingle(),
    supabaseAdmin
      .from("video_completions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("completed_at", dayStart),
    supabaseAdmin
      .from("chapter_completions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("completed_at", dayStart),
    supabaseAdmin.from("xp_transactions").select("amount").eq("user_id", userId).gte("created_at", dayStart),
    supabaseAdmin
      .from("coin_transactions")
      .select("metadata")
      .eq("user_id", userId)
      .eq("reason", "daily_mission")
      .gte("created_at", dayStart),
    loadCurriculum(userId),
  ]);

  const lessonsToday = lessonsRes.count ?? 0;
  const chaptersToday = chaptersRes.count ?? 0;
  const xpToday = (xpRes.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
  const streakDays = statsRes.data?.streak_days ?? 0;
  const checkedIn = statsRes.data?.last_active_date === day ? 1 : 0;
  const claimed = new Set(
    (claimsRes.data ?? [])
      .map((r) => (r.metadata as { code?: string } | null)?.code)
      .filter((c): c is string => !!c),
  );

  // Adapt lesson target to how much content the student actually has left.
  const remaining = curriculum
    ? curriculum.lectures.filter((l) => !curriculum.done.has(l.id)).length
    : 0;

  const progressFor = (code: MissionCode): number => {
    switch (code) {
      case "watch_lessons": return lessonsToday;
      case "earn_xp": return xpToday;
      case "clear_chapter": return chaptersToday;
      case "keep_streak": return checkedIn;
    }
  };

  const missions: DailyMission[] = MISSION_DEFS.filter((m) => {
    if (m.code === "clear_chapter") return remaining > 0;
    return true;
  }).map((m) => {
    const target =
      m.code === "watch_lessons" ? Math.max(1, Math.min(m.target, remaining || m.target)) : m.target;
    const progress = Math.min(progressFor(m.code), target);
    return {
      code: m.code,
      label: m.label,
      description: m.description,
      icon: m.icon,
      target,
      progress,
      complete: progress >= target,
      claimed: claimed.has(m.code),
      xp: m.xp,
      coins: m.coins,
    };
  });

  return {
    day,
    missions,
    completed: missions.filter((m) => m.complete).length,
    total: missions.length,
    streakDays,
  };
}

export const getDailyMissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => computeMissionState(context.userId));

export const claimMissionReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        code: z.enum(["watch_lessons", "earn_xp", "clear_chapter", "keep_streak"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const state = await computeMissionState(userId);
    const mission = state.missions.find((m) => m.code === data.code);
    if (!mission) throw new Error("Mission not available today");
    if (!mission.complete) throw new Error("Mission not complete yet");
    if (mission.claimed) return { alreadyClaimed: true, xp: 0, coins: 0, missions: state };

    const { data: stats } = await supabaseAdmin
      .from("gamification_stats")
      .select("xp, coins")
      .eq("user_id", userId)
      .maybeSingle();

    const newXp = (stats?.xp ?? 0) + mission.xp;
    const newCoins = (stats?.coins ?? 0) + mission.coins;
    await supabaseAdmin
      .from("gamification_stats")
      .update({ xp: newXp, coins: newCoins, level: levelFromXp(newXp), updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    const meta = { code: mission.code, day: state.day };
    if (mission.xp > 0) {
      await supabaseAdmin
        .from("xp_transactions")
        .insert({ user_id: userId, amount: mission.xp, reason: "daily_mission", metadata: meta });
    }
    await supabaseAdmin
      .from("coin_transactions")
      .insert({ user_id: userId, amount: mission.coins, reason: "daily_mission", metadata: meta });

    return {
      alreadyClaimed: false,
      xp: mission.xp,
      coins: mission.coins,
      missions: await computeMissionState(userId),
    };
  });
