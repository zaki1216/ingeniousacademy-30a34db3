import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

// List lectures + quiz config + stats for a chapter or subject.
export const adminListLectureQuizzes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      subjectId: z.string().uuid().nullable().optional(),
      chapterId: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabase } = context;

    let chapQ = supabase.from("chapters").select("id, chapter_name, chapter_number, subject_id, completion_xp, completion_coins");
    if (data.chapterId) chapQ = chapQ.eq("id", data.chapterId);
    else if (data.subjectId) chapQ = chapQ.eq("subject_id", data.subjectId);
    const { data: chapters } = await chapQ.order("chapter_number");
    const chapterIds = (chapters ?? []).map((c) => c.id);
    if (chapterIds.length === 0) return { rows: [] };

    const { data: lectures } = await supabase
      .from("lectures")
      .select("id, lecture_title, lecture_number, chapter_id")
      .in("chapter_id", chapterIds)
      .order("lecture_number");

    const lectureIds = (lectures ?? []).map((l) => l.id);
    const { data: tests } = lectureIds.length
      ? await supabase
          .from("tests")
          .select("id, lecture_id, title, total_marks, passing_marks, marks_per_question, time_limit_seconds")
          .eq("kind", "lecture_quiz")
          .in("lecture_id", lectureIds)
      : { data: [] };

    const testIds = (tests ?? []).map((t) => t.id);
    const [qCountRes, attemptsRes] = await Promise.all([
      testIds.length
        ? supabase.from("questions").select("test_id").in("test_id", testIds)
        : Promise.resolve({ data: [] as { test_id: string }[] }),
      testIds.length
        ? supabase
            .from("quiz_attempts")
            .select("test_id, correct_count")
            .in("test_id", testIds)
        : Promise.resolve({ data: [] as { test_id: string; correct_count: number }[] }),
    ]);

    const qCount = new Map<string, number>();
    for (const q of qCountRes.data ?? []) qCount.set(q.test_id, (qCount.get(q.test_id) ?? 0) + 1);

    const attempts = new Map<string, { total: number; passed: number }>();
    for (const t of tests ?? []) {
      const mpq = t.marks_per_question ?? 1;
      const pass = t.passing_marks ?? 0;
      const rows = (attemptsRes.data ?? []).filter((a) => a.test_id === t.id);
      const passed = rows.filter((a) => (a.correct_count ?? 0) * mpq >= pass).length;
      attempts.set(t.id, { total: rows.length, passed });
    }

    const rows = (lectures ?? []).map((l) => {
      const ch = (chapters ?? []).find((c) => c.id === l.chapter_id)!;
      const test = (tests ?? []).find((t) => t.lecture_id === l.id) ?? null;
      const stat = test ? attempts.get(test.id) ?? { total: 0, passed: 0 } : { total: 0, passed: 0 };
      return {
        lecture_id: l.id,
        lecture_title: l.lecture_title,
        lecture_number: l.lecture_number,
        chapter_id: ch.id,
        chapter_name: ch.chapter_name,
        chapter_number: ch.chapter_number,
        subject_id: ch.subject_id,
        test,
        question_count: test ? qCount.get(test.id) ?? 0 : 0,
        attempts: stat.total,
        pass_rate: stat.total > 0 ? Math.round((stat.passed / stat.total) * 100) : 0,
      };
    });
    return { rows };
  });

// Create or update the lecture quiz (one per lecture).
export const adminUpsertLectureQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      lectureId: z.string().uuid(),
      title: z.string().min(1).max(200),
      marks_per_question: z.number().int().min(1).max(100),
      passing_marks: z.number().int().min(0),
      total_marks: z.number().int().min(0),
      time_limit_seconds: z.number().int().min(0).nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabase } = context;
    const { data: lec } = await supabase.from("lectures").select("chapter_id").eq("id", data.lectureId).maybeSingle();
    if (!lec) throw new Error("Lecture not found");
    const { data: existing } = await supabase
      .from("tests")
      .select("id")
      .eq("lecture_id", data.lectureId)
      .eq("kind", "lecture_quiz")
      .maybeSingle();

    const payload = {
      title: data.title,
      total_marks: data.total_marks,
      passing_marks: data.passing_marks,
      marks_per_question: data.marks_per_question,
      time_limit_seconds: data.time_limit_seconds,
      lecture_id: data.lectureId,
      chapter_id: lec.chapter_id,
      kind: "lecture_quiz" as const,
    };
    if (existing) {
      const { error } = await supabase.from("tests").update(payload).eq("id", existing.id);
      if (error) throw error;
      return { test_id: existing.id };
    }
    const { data: ins, error } = await supabase.from("tests").insert(payload).select("id").single();
    if (error) throw error;
    return { test_id: ins.id };
  });

export const adminGetQuizQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ testId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: qs } = await context.supabase
      .from("questions")
      .select("id, question_text, options, correct_option, question_order, marks")
      .eq("test_id", data.testId)
      .order("question_order");
    return { questions: qs ?? [] };
  });

export const adminUpsertQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid().nullable(),
      test_id: z.string().uuid(),
      question_text: z.string().min(1),
      options: z.array(z.string()).min(2).max(6),
      correct_option: z.number().int().min(0),
      question_order: z.number().int().min(1),
      marks: z.number().int().min(1).default(1),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("questions").update(rest).eq("id", id);
      if (error) throw error;
      return { id };
    }
    const { data: ins, error } = await context.supabase.from("questions").insert(rest).select("id").single();
    if (error) throw error;
    return { id: ins.id };
  });

export const adminDeleteQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("questions").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// Manual unlock toggle per student/lecture
export const adminSetManualUnlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      studentId: z.string().uuid(),
      lectureId: z.string().uuid(),
      unlocked: z.boolean().nullable(), // null clears override
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.unlocked === null) {
      const { error } = await context.supabase
        .from("manual_unlocks")
        .delete()
        .eq("user_id", data.studentId)
        .eq("lecture_id", data.lectureId);
      if (error) throw error;
      return { ok: true };
    }
    const { error } = await context.supabase.from("manual_unlocks").upsert(
      {
        user_id: data.studentId,
        lecture_id: data.lectureId,
        unlocked: data.unlocked,
        created_by: context.userId,
      },
      { onConflict: "user_id,lecture_id" },
    );
    if (error) throw error;
    return { ok: true };
  });

// Per-student progress matrix for the standard
export const adminGetStudentProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ standardId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabase } = context;
    const { data: students } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("standard_id", data.standardId)
      .order("name");

    const { data: subjects } = await supabase.from("subjects").select("id, subject_name").eq("standard_id", data.standardId);
    const subjectIds = (subjects ?? []).map((s) => s.id);
    const { data: chapters } = subjectIds.length
      ? await supabase.from("chapters").select("id, subject_id, chapter_name, chapter_number").in("subject_id", subjectIds)
      : { data: [] };
    const chapterIds = (chapters ?? []).map((c) => c.id);
    const { data: lectures } = chapterIds.length
      ? await supabase.from("lectures").select("id, lecture_title, lecture_number, chapter_id").in("chapter_id", chapterIds).order("lecture_number")
      : { data: [] };
    const lectureIds = (lectures ?? []).map((l) => l.id);
    const { data: tests } = lectureIds.length
      ? await supabase.from("tests").select("id, lecture_id, passing_marks, marks_per_question").eq("kind", "lecture_quiz").in("lecture_id", lectureIds)
      : { data: [] };
    const studentIds = (students ?? []).map((s) => s.id);
    const { data: attempts } = studentIds.length
      ? await supabase.from("quiz_attempts").select("student_id, test_id, lecture_id, correct_count").in("student_id", studentIds)
      : { data: [] };

    return { students: students ?? [], subjects: subjects ?? [], chapters: chapters ?? [], lectures: lectures ?? [], tests: tests ?? [], attempts: attempts ?? [] };
  });

export const adminSetChapterRewards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      chapterId: z.string().uuid(),
      completion_xp: z.number().int().min(0),
      completion_coins: z.number().int().min(0),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { chapterId, ...rest } = data;
    const { error } = await context.supabase.from("chapters").update(rest).eq("id", chapterId);
    if (error) throw error;
    return { ok: true };
  });
