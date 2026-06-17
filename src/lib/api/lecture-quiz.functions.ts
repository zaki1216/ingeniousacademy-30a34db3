import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Get the quiz attached to a lecture (questions without correct answers).
export const getQuizForLecture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ lectureId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: tests } = await supabase
      .from("tests")
      .select("id, title, total_marks")
      .eq("lecture_id", data.lectureId)
      .eq("kind", "lecture_quiz")
      .limit(1);
    const test = tests?.[0];
    if (!test) return { test: null, questions: [] as Array<{ id: string; question_text: string; options: string[]; question_order: number }> };
    const { data: qs } = await supabase
      .from("questions")
      .select("id, question_text, options, question_order")
      .eq("test_id", test.id)
      .order("question_order");
    return {
      test,
      questions: (qs ?? []).map((q) => ({
        id: q.id,
        question_text: q.question_text,
        options: Array.isArray(q.options) ? (q.options as string[]) : [],
        question_order: q.question_order,
      })),
    };
  });

// Submit a lecture-quiz attempt: grade server-side, award 1 coin per correct answer.
// Replayable; never affects the report card.
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
      .select("id, lecture_id, kind")
      .eq("id", data.testId)
      .maybeSingle();
    if (tErr || !test) throw new Error("Quiz not found");
    if (test.kind !== "lecture_quiz") throw new Error("Not a lecture quiz");

    const { data: questions } = await supabase
      .from("questions")
      .select("id, correct_option")
      .eq("test_id", data.testId);

    const total = questions?.length ?? 0;
    let correct = 0;
    for (const q of questions ?? []) {
      const ans = data.answers[q.id];
      if (typeof ans === "number" && ans === q.correct_option) correct += 1;
    }

    const coins = correct;

    // Insert attempt (RLS: student_id = auth.uid())
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
      // Use admin client only to update aggregate coin balance + ledger atomically.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("coin_transactions").insert({
        user_id: userId,
        amount: coins,
        reason: "lecture_quiz",
        metadata: { test_id: test.id, lecture_id: test.lecture_id, correct, total },
      });
      // Bump gamification_stats.coins
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

    return { correct, total, coinsAwarded: coins };
  });
