import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LectureUnlockState = {
  lecture_id: string;
  chapter_id: string;
  subject_id: string;
  lecture_number: number;
  unlocked: boolean;
  quiz_passed: boolean;
  best_score: number;
  passing_marks: number;
  total_marks: number;
  test_id: string | null;
  prev_lecture_id: string | null;
  prev_lecture_number: number | null;
  prev_passing_marks: number;
  prev_total_marks: number;
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

  const [profileRes, manualRes, attemptsRes] = await Promise.all([
    supabaseAdmin.from("profiles").select("standard_id").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("manual_unlocks").select("lecture_id, unlocked").eq("user_id", userId),
    supabaseAdmin.from("quiz_attempts").select("lecture_id, test_id, correct_count").eq("student_id", userId),
  ]);

  const standardId = profileRes.data?.standard_id;
  if (!standardId) return [] as LectureUnlockState[];

  const subjectsRes = await supabaseAdmin.from("subjects").select("id").eq("standard_id", standardId);
  const subjectIds = (subjectsRes.data ?? []).map((s) => s.id);
  if (subjectIds.length === 0) return [];

  const chaptersRes = await supabaseAdmin.from("chapters").select("id, subject_id").in("subject_id", subjectIds);
  const chapterIds = (chaptersRes.data ?? []).map((c) => c.id);
  if (chapterIds.length === 0) return [];

  const [lecturesRes, testsRes] = await Promise.all([
    supabaseAdmin.from("lectures").select("id, chapter_id, lecture_number").in("chapter_id", chapterIds),
    supabaseAdmin.from("tests").select("id, lecture_id, passing_marks, total_marks, marks_per_question, kind").eq("kind", "lecture_quiz"),
  ]);

  const lectures = lecturesRes.data ?? [];
  const tests = (testsRes.data ?? []).filter((t) => t.lecture_id && lectures.some((l) => l.id === t.lecture_id));
  const testByLecture = new Map<string, (typeof tests)[number]>();
  for (const t of tests) if (t.lecture_id) testByLecture.set(t.lecture_id, t);

  // best score per lecture
  const bestByLecture = new Map<string, number>();
  for (const a of attemptsRes.data ?? []) {
    const mpq = (a.test_id && tests.find((t) => t.id === a.test_id)?.marks_per_question) ?? 1;
    const score = (a.correct_count ?? 0) * mpq;
    const prev = bestByLecture.get(a.lecture_id ?? "") ?? 0;
    if (score > prev) bestByLecture.set(a.lecture_id ?? "", score);
  }

  const manualMap = new Map<string, boolean>();
  for (const m of manualRes.data ?? []) manualMap.set(m.lecture_id, m.unlocked);

  // group lectures by chapter, sort by lecture_number
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
      const prevTest = prev ? testByLecture.get(prev.id) ?? null : null;
      const myTest = testByLecture.get(l.id) ?? null;
      const best = bestByLecture.get(l.id) ?? 0;

      let unlocked: boolean;
      const manual = manualMap.get(l.id);
      if (manual === true) unlocked = true;
      else if (manual === false) unlocked = false;
      else if (!prev) unlocked = true;
      else if (!prevTest || (prevTest.passing_marks ?? 0) === 0) unlocked = true;
      else {
        const prevBest = bestByLecture.get(prev.id) ?? 0;
        unlocked = prevBest >= (prevTest.passing_marks ?? 0);
      }

      const passing = myTest?.passing_marks ?? 0;
      const quiz_passed = !!myTest && passing > 0 && best >= passing;

      out.push({
        lecture_id: l.id,
        chapter_id: chapterId,
        subject_id: subjectOfChapter.get(chapterId) ?? "",
        lecture_number: l.lecture_number,
        unlocked,
        quiz_passed,
        best_score: best,
        passing_marks: passing,
        total_marks: myTest?.total_marks ?? 0,
        test_id: myTest?.id ?? null,
        prev_lecture_id: prev?.id ?? null,
        prev_lecture_number: prev?.lecture_number ?? null,
        prev_passing_marks: prevTest?.passing_marks ?? 0,
        prev_total_marks: prevTest?.total_marks ?? 0,
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
    const passed = arr.filter((x) => x.quiz_passed).length;
    const attempted = arr.filter((x) => x.best_score > 0).length;
    const completed = passed;
    const next = arr.find((x) => x.unlocked && !x.quiz_passed) ?? null;
    out.push({
      chapter_id,
      subject_id: arr[0]?.subject_id ?? "",
      total,
      completed,
      attempted,
      passed,
      pass_rate: attempted > 0 ? Math.round((passed / attempted) * 100) : 0,
      percent: total > 0 ? Math.round((passed / total) * 100) : 0,
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
