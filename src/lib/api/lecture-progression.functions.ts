import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Lecture progression (post-quiz-removal).
 *
 * A lecture unlocks when the previous lecture in the same chapter is
 * marked complete (via `video_completions`), or when an admin has granted
 * a manual override in `manual_unlocks`. Chapter completion is derived
 * from all lectures being completed.
 */
export type LectureUnlockState = {
  lecture_id: string;
  chapter_id: string;
  subject_id: string;
  lecture_number: number;
  unlocked: boolean;
  completed: boolean;
  prev_lecture_id: string | null;
  prev_lecture_number: number | null;
};

export type ChapterAgg = {
  chapter_id: string;
  subject_id: string;
  total: number;
  completed: number;
  attempted: number;
  passed: number;
  pass_rate: number;
  percent: number;
  next_to_unlock: { lecture_id: string; lecture_number: number } | null;
};

async function computeUnlockState(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [profileRes, manualRes, completionsRes] = await Promise.all([
    supabaseAdmin.from("profiles").select("standard_id").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("manual_unlocks").select("lecture_id, unlocked").eq("user_id", userId),
    supabaseAdmin.from("video_completions").select("lecture_id").eq("user_id", userId),
  ]);

  const standardId = profileRes.data?.standard_id;
  if (!standardId) return [] as LectureUnlockState[];

  const subjectsRes = await supabaseAdmin.from("subjects").select("id").eq("standard_id", standardId);
  const subjectIds = (subjectsRes.data ?? []).map((s) => s.id);
  if (subjectIds.length === 0) return [];

  const chaptersRes = await supabaseAdmin
    .from("chapters")
    .select("id, subject_id")
    .in("subject_id", subjectIds);
  const chapterIds = (chaptersRes.data ?? []).map((c) => c.id);
  if (chapterIds.length === 0) return [];

  const lecturesRes = await supabaseAdmin
    .from("lectures")
    .select("id, chapter_id, lecture_number")
    .in("chapter_id", chapterIds);
  const lectures = lecturesRes.data ?? [];

  const completedSet = new Set((completionsRes.data ?? []).map((c) => c.lecture_id));
  const manualMap = new Map<string, boolean>();
  for (const m of manualRes.data ?? []) manualMap.set(m.lecture_id, m.unlocked);

  const byChapter = new Map<string, typeof lectures>();
  for (const l of lectures) {
    const arr = byChapter.get(l.chapter_id) ?? [];
    arr.push(l);
    byChapter.set(l.chapter_id, arr);
  }
  const subjectOfChapter = new Map<string, string>();
  for (const c of chaptersRes.data ?? []) subjectOfChapter.set(c.id, c.subject_id);

  const out: LectureUnlockState[] = [];
  for (const [chapterId, lecs] of byChapter) {
    lecs.sort((a, b) => a.lecture_number - b.lecture_number);
    for (let i = 0; i < lecs.length; i++) {
      const l = lecs[i];
      const prev = i === 0 ? null : lecs[i - 1];
      const manual = manualMap.get(l.id);
      let unlocked: boolean;
      if (manual === true) unlocked = true;
      else if (manual === false) unlocked = false;
      else if (!prev) unlocked = true;
      else unlocked = completedSet.has(prev.id);

      out.push({
        lecture_id: l.id,
        chapter_id: chapterId,
        subject_id: subjectOfChapter.get(chapterId) ?? "",
        lecture_number: l.lecture_number,
        unlocked,
        completed: completedSet.has(l.id),
        prev_lecture_id: prev?.id ?? null,
        prev_lecture_number: prev?.lecture_number ?? null,
      });
    }
  }
  return out;
}

function aggregateByChapter(states: LectureUnlockState[]): ChapterAgg[] {
  const groups = new Map<string, LectureUnlockState[]>();
  for (const s of states) {
    const arr = groups.get(s.chapter_id) ?? [];
    arr.push(s);
    groups.set(s.chapter_id, arr);
  }
  const out: ChapterAgg[] = [];
  for (const [chapter_id, arr] of groups) {
    arr.sort((a, b) => a.lecture_number - b.lecture_number);
    const total = arr.length;
    const completed = arr.filter((x) => x.completed).length;
    const next = arr.find((x) => x.unlocked && !x.completed) ?? null;
    out.push({
      chapter_id,
      subject_id: arr[0]?.subject_id ?? "",
      total,
      completed,
      attempted: completed,
      passed: completed,
      pass_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      next_to_unlock: next ? { lecture_id: next.lecture_id, lecture_number: next.lecture_number } : null,
    });
  }
  return out;
}

export const getLectureProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const states = await computeUnlockState(context.userId);
    const chapters = aggregateByChapter(states);
    return { states, chapters };
  });
