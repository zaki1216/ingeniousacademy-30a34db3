/**
 * Server-only implementation of the Continue Learning Engine and the
 * Daily Mission system. Kept out of *.functions.ts so the server-fn
 * splitter only sees thin wrappers.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { subjectIdsForStandard } from "@/lib/curriculum/shared.server";
import { levelFromXp } from "@/lib/gamification/leveling";

import { MINUTES_PER_LESSON, MISSION_DEFS, type MissionCode } from "@/lib/learning/missions";
import type {
  ContinueLearningResult,
  DailyMission,
  DailyMissionsResult,
} from "@/lib/learning/types";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type Curriculum = {
  subjects: { id: string; subject_name: string }[];
  chapters: { id: string; chapter_name: string; chapter_number: number; subject_id: string }[];
  lectures: { id: string; lecture_title: string; lecture_number: number; chapter_id: string }[];
  done: Set<string>;
};

async function loadCurriculum(userId: string): Promise<Curriculum | null> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("standard_id")
    .eq("id", userId)
    .maybeSingle();

  const standardId = profile?.standard_id ?? null;
  if (!standardId) return null;

  const linkedIds = await subjectIdsForStandard(supabaseAdmin, standardId);
  const { data: subjects } = linkedIds.length
    ? await supabaseAdmin
        .from("subjects")
        .select("id, subject_name, created_at")
        .in("id", linkedIds)
        .eq("status", "active")
        .order("created_at", { ascending: true })
    : { data: [] as { id: string; subject_name: string; created_at: string }[] };


  const subjectIds = (subjects ?? []).map((s) => s.id);
  const empty: Curriculum = { subjects: [], chapters: [], lectures: [], done: new Set() };
  if (subjectIds.length === 0) return empty;

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
    : { data: [] as Curriculum["lectures"] };

  const { data: completions } = await supabaseAdmin
    .from("video_completions")
    .select("lecture_id")
    .eq("user_id", userId);

  return {
    subjects: (subjects ?? []).map((s) => ({ id: s.id, subject_name: s.subject_name ?? "" })),
    chapters: (chapters ?? []).map((c) => ({
      id: c.id,
      chapter_name: c.chapter_name ?? "",
      chapter_number: c.chapter_number,
      subject_id: c.subject_id,
    })),
    lectures: (lectures ?? []) as Curriculum["lectures"],
    done: new Set((completions ?? []).map((c) => c.lecture_id)),
  };
}

export async function computeContinueLearning(userId: string): Promise<ContinueLearningResult> {
  const empty: ContinueLearningResult = {
    status: "no_content",
    target: null,
    overall: { total: 0, done: 0, percent: 0 },
    suggestion: null,
  };
  const data = await loadCurriculum(userId);
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
    lectures
      .filter((l) => l.chapter_id === chapterId)
      .sort((a, b) => a.lecture_number - b.lecture_number);

  const candidates: Array<{
    subject: Curriculum["subjects"][number];
    chapter: Curriculum["chapters"][number];
    lecs: Curriculum["lectures"];
    started: boolean;
  }> = [];

  for (const s of subjects) {
    const subChapters = chapters
      .filter((c) => c.subject_id === s.id)
      .sort((a, b) => a.chapter_number - b.chapter_number);
    for (const c of subChapters) {
      const lecs = lecturesOf(c.id);
      if (lecs.length === 0) continue;
      if (lecs.every((l) => done.has(l.id))) continue;
      candidates.push({ subject: s, chapter: c, lecs, started: lecs.some((l) => done.has(l.id)) });
    }
  }

  if (candidates.length === 0) {
    const suggestion = subjects[0]
      ? { subjectId: subjects[0].id, subjectName: subjects[0].subject_name }
      : null;
    return { status: "all_complete", target: null, overall, suggestion };
  }

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
}

export async function computeMissionState(userId: string): Promise<DailyMissionsResult> {
  const day = todayISO();
  const dayStart = `${day}T00:00:00.000Z`;

  const [statsRes, lessonsRes, chaptersRes, xpRes, claimsRes, curriculum] = await Promise.all([
    supabaseAdmin
      .from("gamification_stats")
      .select("streak_days, last_active_date")
      .eq("user_id", userId)
      .maybeSingle(),
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
  const checkedIn = statsRes.data?.last_active_date === day ? 1 : 0;
  const claimed = new Set(
    (claimsRes.data ?? [])
      .map((r) => (r.metadata as { code?: string } | null)?.code)
      .filter((c): c is string => !!c),
  );

  const remaining = curriculum
    ? curriculum.lectures.filter((l) => !curriculum.done.has(l.id)).length
    : 0;

  const progressFor = (code: MissionCode): number => {
    switch (code) {
      case "watch_lessons":
        return lessonsToday;
      case "earn_xp":
        return xpToday;
      case "clear_chapter":
        return chaptersToday;
      case "keep_streak":
        return checkedIn;
      default:
        return 0;
    }
  };

  const missions: DailyMission[] = MISSION_DEFS.filter(
    (m) => m.code !== "clear_chapter" || remaining > 0,
  ).map((m) => {
    const target =
      m.code === "watch_lessons" ? Math.max(1, Math.min(m.target, remaining || m.target)) : m.target;
    const progress = Math.min(progressFor(m.code), target);
    return {
      code: m.code,
      label: m.code === "watch_lessons" && target === 1 ? "Watch 1 Lesson" : m.label,
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
    streakDays: statsRes.data?.streak_days ?? 0,
  };
}

export async function claimMission(userId: string, code: MissionCode) {
  const state = await computeMissionState(userId);
  const mission = state.missions.find((m) => m.code === code);
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

  const metadata = { code: mission.code, day: state.day };
  if (mission.xp > 0) {
    await supabaseAdmin
      .from("xp_transactions")
      .insert({ user_id: userId, amount: mission.xp, reason: "daily_mission", metadata });
  }
  await supabaseAdmin
    .from("coin_transactions")
    .insert({ user_id: userId, amount: mission.coins, reason: "daily_mission", metadata });

  return {
    alreadyClaimed: false,
    xp: mission.xp,
    coins: mission.coins,
    missions: await computeMissionState(userId),
  };
}
