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

const RowSchema = z.object({
  rowNumber: z.number().int().min(1),
  subject: z.string().min(1),
  chapter: z.string().min(1),
  lecture: z.string().min(1),
  passingMarks: z.number().int().min(0),
  question: z.string().min(1),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
});

export const adminBulkImportQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      standardId: z.string().uuid(),
      autoCreateLectures: z.boolean().default(true),
      rows: z.array(RowSchema).min(1).max(2000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabase } = context;

    const errors: { row: number; message: string }[] = [];
    const created = { subjects: 0, chapters: 0, lectures: 0, quizzes: 0, questions: 0 };

    // Cache existing subjects/chapters/lectures for this standard
    const { data: subjects } = await supabase
      .from("subjects").select("id, subject_name").eq("standard_id", data.standardId);
    const subjectMap = new Map<string, string>(
      (subjects ?? []).map((s: any) => [s.subject_name.trim().toLowerCase(), s.id]),
    );

    const subjectIds = [...subjectMap.values()];
    const { data: chapters } = subjectIds.length
      ? await supabase.from("chapters").select("id, chapter_name, subject_id").in("subject_id", subjectIds)
      : { data: [] };
    const chapterMap = new Map<string, string>(
      (chapters ?? []).map((c: any) => [`${c.subject_id}::${c.chapter_name.trim().toLowerCase()}`, c.id]),
    );

    const chapterIds = (chapters ?? []).map((c: any) => c.id);
    const { data: lectures } = chapterIds.length
      ? await supabase.from("lectures").select("id, lecture_title, chapter_id").in("chapter_id", chapterIds)
      : { data: [] };
    const lectureMap = new Map<string, string>(
      (lectures ?? []).map((l: any) => [`${l.chapter_id}::${l.lecture_title.trim().toLowerCase()}`, l.id]),
    );

    // Group rows by lecture key, but resolve/create subject->chapter->lecture sequentially
    type Group = {
      subject: string; chapter: string; lecture: string;
      passingMarks: number;
      rows: typeof data.rows;
    };
    const groups = new Map<string, Group>();
    for (const r of data.rows) {
      const key = `${r.subject.trim().toLowerCase()}|${r.chapter.trim().toLowerCase()}|${r.lecture.trim().toLowerCase()}`;
      let g = groups.get(key);
      if (!g) {
        g = { subject: r.subject.trim(), chapter: r.chapter.trim(), lecture: r.lecture.trim(), passingMarks: r.passingMarks, rows: [] };
        groups.set(key, g);
      }
      g.rows.push(r);
    }

    for (const g of groups.values()) {
      try {
        // Subject
        const subjKey = g.subject.toLowerCase();
        let subjectId = subjectMap.get(subjKey);
        if (!subjectId) {
          const { data: ins, error } = await supabase
            .from("subjects").insert({ subject_name: g.subject, standard_id: data.standardId })
            .select("id").single();
          if (error) throw new Error(`Subject "${g.subject}": ${error.message}`);
          subjectId = ins.id;
          subjectMap.set(subjKey, subjectId!);
          created.subjects++;
        }

        // Chapter
        const chKey = `${subjectId}::${g.chapter.toLowerCase()}`;
        let chapterId = chapterMap.get(chKey);
        if (!chapterId) {
          // Next chapter_number
          const { data: existing } = await supabase
            .from("chapters").select("chapter_number").eq("subject_id", subjectId).order("chapter_number", { ascending: false }).limit(1);
          const nextNum = ((existing?.[0]?.chapter_number ?? 0) as number) + 1;
          const { data: ins, error } = await supabase
            .from("chapters").insert({ chapter_name: g.chapter, subject_id: subjectId, chapter_number: nextNum })
            .select("id").single();
          if (error) throw new Error(`Chapter "${g.chapter}": ${error.message}`);
          chapterId = ins.id;
          chapterMap.set(chKey, chapterId!);
          created.chapters++;
        }

        // Lecture
        const lecKey = `${chapterId}::${g.lecture.toLowerCase()}`;
        let lectureId = lectureMap.get(lecKey);
        if (!lectureId) {
          if (!data.autoCreateLectures) {
            for (const r of g.rows) errors.push({ row: r.rowNumber, message: `Lecture "${g.lecture}" not found (auto-create disabled)` });
            continue;
          }
          const { data: existing } = await supabase
            .from("lectures").select("lecture_number").eq("chapter_id", chapterId).order("lecture_number", { ascending: false }).limit(1);
          const nextNum = ((existing?.[0]?.lecture_number ?? 0) as number) + 1;
          const { data: ins, error } = await supabase
            .from("lectures").insert({
              lecture_title: g.lecture, chapter_id: chapterId, lecture_number: nextNum, youtube_url: "",
            }).select("id").single();
          if (error) throw new Error(`Lecture "${g.lecture}": ${error.message}`);
          lectureId = ins.id;
          lectureMap.set(lecKey, lectureId!);
          created.lectures++;
        }

        // Test (lecture quiz): upsert one per lecture
        const { data: existingTest } = await supabase
          .from("tests").select("id").eq("lecture_id", lectureId).eq("kind", "lecture_quiz").maybeSingle();

        const qCount = g.rows.length;
        const totalMarks = qCount;
        const passingMarks = Math.min(g.passingMarks, totalMarks);
        let testId: string;
        if (existingTest) {
          testId = existingTest.id;
          const { error } = await supabase.from("tests").update({
            title: `Quiz: ${g.lecture}`,
            total_marks: totalMarks,
            passing_marks: passingMarks,
            marks_per_question: 1,
          }).eq("id", testId);
          if (error) throw new Error(`Quiz update: ${error.message}`);
          // Clear old questions for clean replace
          await supabase.from("questions").delete().eq("test_id", testId);
        } else {
          const { data: ins, error } = await supabase.from("tests").insert({
            title: `Quiz: ${g.lecture}`,
            lecture_id: lectureId,
            chapter_id: chapterId,
            kind: "lecture_quiz",
            total_marks: totalMarks,
            passing_marks: passingMarks,
            marks_per_question: 1,
          }).select("id").single();
          if (error) throw new Error(`Quiz create: ${error.message}`);
          testId = ins.id;
          created.quizzes++;
        }

        // Questions
        const qPayload = g.rows.map((r, i) => ({
          test_id: testId,
          question_text: r.question,
          options: [r.optionA, r.optionB, r.optionC, r.optionD],
          correct_option: { A: 0, B: 1, C: 2, D: 3 }[r.correctAnswer],
          question_order: i + 1,
          marks: 1,
        }));
        const { error: qErr } = await supabase.from("questions").insert(qPayload);
        if (qErr) throw new Error(`Questions: ${qErr.message}`);
        created.questions += qPayload.length;
      } catch (e: any) {
        for (const r of g.rows) errors.push({ row: r.rowNumber, message: e?.message ?? "Failed" });
      }
    }

    return { created, errors };
  });
