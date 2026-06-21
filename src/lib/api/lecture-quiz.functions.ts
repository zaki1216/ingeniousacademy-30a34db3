import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Get the quiz attached to a lecture (questions without correct answers).
export const getQuizForLecture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ lectureId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: tests } = await supabase
      .from("tests")
      .select("id, title, total_marks, passing_marks, marks_per_question, time_limit_seconds")
      .eq("lecture_id", data.lectureId)
      .eq("kind", "lecture_quiz")
      .limit(1);
    const test = tests?.[0];
    if (!test)
      return {
        test: null,
        questions: [] as Array<{ id: string; question_text: string; options: string[]; question_order: number }>,
        bestScore: 0,
        attempts: 0,
      };
    // Use admin client and project ONLY safe columns — never expose correct_option to clients.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: qs } = await supabaseAdmin
      .from("questions")
      .select("id, question_text, options, question_order")
      .eq("test_id", test.id)
      .order("question_order");
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("correct_count")
      .eq("student_id", userId)
      .eq("test_id", test.id);
    const mpq = test.marks_per_question ?? 1;
    const best = (attempts ?? []).reduce((m, a) => Math.max(m, (a.correct_count ?? 0) * mpq), 0);
    return {
      test,
      questions: (qs ?? []).map((q) => ({
        id: q.id,
        question_text: q.question_text,
        options: Array.isArray(q.options) ? (q.options as string[]) : [],
        question_order: q.question_order,
      })),
      bestScore: best,
      attempts: attempts?.length ?? 0,
    };
  });

export const submitLectureQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      testId: z.string().uuid(),
      answers: z.record(z.string().uuid(), z.number().int().min(0)),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: test, error: tErr } = await supabase
      .from("tests")
      .select("id, lecture_id, kind, passing_marks, marks_per_question, total_marks, chapter_id")
      .eq("id", data.testId)
      .maybeSingle();
    if (tErr || !test) throw new Error("Quiz not found");
    if (test.kind !== "lecture_quiz") throw new Error("Not a lecture quiz");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: questions } = await supabaseAdmin
      .from("questions")
      .select("id, correct_option")
      .eq("test_id", data.testId);

    const total = questions?.length ?? 0;
    let correct = 0;
    for (const q of questions ?? []) {
      const ans = data.answers[q.id];
      if (typeof ans === "number" && ans === q.correct_option) correct += 1;
    }

    const mpq = test.marks_per_question ?? 1;
    const score = correct * mpq;
    const passingMarks = test.passing_marks ?? 0;
    const passed = passingMarks > 0 && score >= passingMarks;
    const coins = correct;

    const { error: aErr } = await supabase.from("quiz_attempts").insert({
      student_id: userId,
      test_id: test.id,
      lecture_id: test.lecture_id,
      correct_count: correct,
      total_questions: total,
      coins_awarded: coins,
    });
    if (aErr) throw aErr;


    if (coins > 0) {
      await supabaseAdmin.from("coin_transactions").insert({
        user_id: userId,
        amount: coins,
        reason: "lecture_quiz",
        metadata: { test_id: test.id, lecture_id: test.lecture_id, correct, total },
      });
      const { data: stats } = await supabaseAdmin
        .from("gamification_stats")
        .select("coins")
        .eq("user_id", userId)
        .maybeSingle();
      const newCoins = (stats?.coins ?? 0) + coins;
      if (stats) {
        await supabaseAdmin.from("gamification_stats").update({ coins: newCoins }).eq("user_id", userId);
      } else {
        await supabaseAdmin.from("gamification_stats").insert({ user_id: userId, coins: newCoins });
      }
    }

    // Chapter completion reward (idempotent): when all lecture quizzes in chapter are passed.
    let chapterCompleted: null | { xp: number; coins: number } = null;
    let nextLectureUnlocked = false;
    if (passed && test.lecture_id) {
      const { data: lec } = await supabaseAdmin.from("lectures").select("chapter_id, lecture_number").eq("id", test.lecture_id).maybeSingle();
      if (lec) {
        // unlock next?
        const { data: nextLec } = await supabaseAdmin
          .from("lectures")
          .select("id")
          .eq("chapter_id", lec.chapter_id)
          .gt("lecture_number", lec.lecture_number)
          .order("lecture_number")
          .limit(1)
          .maybeSingle();
        nextLectureUnlocked = !!nextLec;

        // Was this the final quiz in the chapter?
        const { data: chapterLectures } = await supabaseAdmin
          .from("lectures")
          .select("id")
          .eq("chapter_id", lec.chapter_id);
        const lectureIds = (chapterLectures ?? []).map((l) => l.id);
        const { data: chapterTests } = await supabaseAdmin
          .from("tests")
          .select("id, lecture_id, passing_marks, marks_per_question")
          .eq("kind", "lecture_quiz")
          .in("lecture_id", lectureIds);

        const requiredTests = (chapterTests ?? []).filter((t) => (t.passing_marks ?? 0) > 0);
        if (requiredTests.length > 0) {
          const { data: myAttempts } = await supabaseAdmin
            .from("quiz_attempts")
            .select("test_id, correct_count")
            .eq("student_id", userId)
            .in("test_id", requiredTests.map((t) => t.id));
          const bestByTest = new Map<string, number>();
          for (const a of myAttempts ?? []) {
            const t = requiredTests.find((x) => x.id === a.test_id);
            const m = (t?.marks_per_question ?? 1) * (a.correct_count ?? 0);
            const tid = a.test_id ?? "";
            if (m > (bestByTest.get(tid) ?? 0)) bestByTest.set(tid, m);
          }
          const allPassed = requiredTests.every((t) => (bestByTest.get(t.id) ?? 0) >= (t.passing_marks ?? 0));
          if (allPassed) {
            const { data: existing } = await supabaseAdmin
              .from("chapter_completions")
              .select("id")
              .eq("user_id", userId)
              .eq("chapter_id", lec.chapter_id)
              .maybeSingle();
            if (!existing) {
              const { data: chapter } = await supabaseAdmin
                .from("chapters")
                .select("completion_xp, completion_coins")
                .eq("id", lec.chapter_id)
                .maybeSingle();
              const xp = chapter?.completion_xp ?? 100;
              const bonus = chapter?.completion_coins ?? 50;
              await supabaseAdmin.from("chapter_completions").insert({
                user_id: userId,
                chapter_id: lec.chapter_id,
                xp_awarded: xp,
                coins_awarded: bonus,
              });
              if (xp > 0) {
                await supabaseAdmin.from("xp_transactions").insert({
                  user_id: userId,
                  amount: xp,
                  reason: "chapter_completion",
                  metadata: { chapter_id: lec.chapter_id },
                });
                const { data: gs } = await supabaseAdmin.from("gamification_stats").select("xp").eq("user_id", userId).maybeSingle();
                const newXp = (gs?.xp ?? 0) + xp;
                if (gs) await supabaseAdmin.from("gamification_stats").update({ xp: newXp }).eq("user_id", userId);
                else await supabaseAdmin.from("gamification_stats").insert({ user_id: userId, xp: newXp });
              }
              if (bonus > 0) {
                await supabaseAdmin.from("coin_transactions").insert({
                  user_id: userId,
                  amount: bonus,
                  reason: "chapter_completion",
                  metadata: { chapter_id: lec.chapter_id },
                });
                const { data: gs2 } = await supabaseAdmin.from("gamification_stats").select("coins").eq("user_id", userId).maybeSingle();
                const newCoins = (gs2?.coins ?? 0) + bonus;
                if (gs2) await supabaseAdmin.from("gamification_stats").update({ coins: newCoins }).eq("user_id", userId);
                else await supabaseAdmin.from("gamification_stats").insert({ user_id: userId, coins: newCoins });
              }
              chapterCompleted = { xp, coins: bonus };
            }
          }
        }
      }
    }

    return {
      correct,
      total,
      score,
      passingMarks,
      totalMarks: test.total_marks ?? total * mpq,
      passed,
      coinsAwarded: coins,
      nextLectureUnlocked,
      chapterCompleted,
    };
  });
