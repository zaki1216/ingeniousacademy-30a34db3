import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const NUM_QUESTIONS = 5;
const DEFAULT_PRIZE_COINS = 50;
const DEFAULT_PRIZE_XP = 30;

async function pickRandomQuestions(testId?: string | null) {
  let q = supabaseAdmin
    .from("questions")
    .select("id, question_text, options, correct_option, marks");
  if (testId) q = q.eq("test_id", testId);
  const { data } = await q.limit(200);
  if (!data || data.length === 0) throw new Error("No questions available");
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(NUM_QUESTIONS, shuffled.length));
}

async function awardWinner(userId: string, coins: number, xp: number, reason: string) {
  const { data: stats } = await supabaseAdmin
    .from("gamification_stats")
    .select("xp, coins")
    .eq("user_id", userId)
    .maybeSingle();
  const newXp = (stats?.xp ?? 0) + xp;
  const newCoins = (stats?.coins ?? 0) + coins;
  if (stats) {
    await supabaseAdmin
      .from("gamification_stats")
      .update({ xp: newXp, coins: newCoins, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  } else {
    await supabaseAdmin
      .from("gamification_stats")
      .insert({ user_id: userId, xp: newXp, coins: newCoins });
  }
  await supabaseAdmin.from("coin_transactions").insert({ user_id: userId, amount: coins, reason });
  await supabaseAdmin.from("xp_transactions").insert({ user_id: userId, amount: xp, reason });
}

// ===================== LIST OPPONENTS =====================
export const listPvpOpponents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "student");
    const ids = (roles ?? []).map((r) => r.user_id).filter((id) => id !== context.userId);
    if (ids.length === 0) return [];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, name")
      .in("id", ids)
      .limit(50);
    const { data: stats } = await supabaseAdmin
      .from("gamification_stats")
      .select("user_id, level")
      .in("user_id", ids);
    const levelOf = new Map((stats ?? []).map((s) => [s.user_id, s.level]));
    return (profiles ?? []).map((p) => ({
      id: p.id,
      name: p.name || "Player",
      level: levelOf.get(p.id) ?? 1,
    }));
  });

// ===================== CHALLENGE =====================
export const createDuel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ opponentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.opponentId === context.userId) throw new Error("Cannot duel yourself");
    const questions = await pickRandomQuestions();
    const { data: duel, error } = await supabaseAdmin
      .from("pvp_duels")
      .insert({
        challenger_id: context.userId,
        opponent_id: data.opponentId,
        question_ids: questions.map((q) => q.id),
        prize_coins: DEFAULT_PRIZE_COINS,
        prize_xp: DEFAULT_PRIZE_XP,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: duel.id };
  });

// ===================== LIST DUELS =====================
export const listMyDuels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    const { data } = await supabaseAdmin
      .from("pvp_duels")
      .select("*")
      .or(`challenger_id.eq.${uid},opponent_id.eq.${uid}`)
      .order("created_at", { ascending: false })
      .limit(30);
    const userIds = Array.from(
      new Set(
        (data ?? []).flatMap((d) => [d.challenger_id, d.opponent_id, d.winner_id]).filter(Boolean),
      ),
    ) as string[];
    const { data: profs } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, name").in("id", userIds)
      : { data: [] };
    const nameOf = (id: string | null) => {
      const p = profs?.find((x) => x.id === id);
      return p?.name || "Player";
    };
    return (data ?? []).map((d) => ({
      id: d.id,
      status: d.status,
      isChallenger: d.challenger_id === uid,
      challenger: { id: d.challenger_id, name: nameOf(d.challenger_id) },
      opponent: { id: d.opponent_id, name: nameOf(d.opponent_id) },
      challenger_score: d.challenger_score,
      opponent_score: d.opponent_score,
      winner: d.winner_id ? { id: d.winner_id, name: nameOf(d.winner_id) } : null,
      prize_coins: d.prize_coins,
      prize_xp: d.prize_xp,
      expires_at: d.expires_at,
      created_at: d.created_at,
      iAmDone: false, // computed below per detail
    }));
  });

// ===================== GET DUEL DETAILS =====================
export const getDuel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const uid = context.userId;
    const { data: duel } = await supabaseAdmin
      .from("pvp_duels")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!duel) throw new Error("Duel not found");
    if (duel.challenger_id !== uid && duel.opponent_id !== uid) throw new Error("Not in duel");

    const { data: questions } = await supabaseAdmin
      .from("questions")
      .select("id, question_text, options, correct_option, marks")
      .in("id", duel.question_ids);

    const ordered = duel.question_ids
      .map((qid: string) => questions?.find((q) => q.id === qid))
      .filter(Boolean);

    const { data: myAnswers } = await supabaseAdmin
      .from("pvp_duel_answers")
      .select("question_id, is_correct, selected")
      .eq("duel_id", data.id)
      .eq("user_id", uid);

    const finished = duel.status === "finished";
    const showCorrect = finished;

    return {
      id: duel.id,
      status: duel.status,
      isChallenger: duel.challenger_id === uid,
      challenger_score: duel.challenger_score,
      opponent_score: duel.opponent_score,
      winner_id: duel.winner_id,
      prize_coins: duel.prize_coins,
      prize_xp: duel.prize_xp,
      my_answers: myAnswers ?? [],
      questions: (ordered as Array<{
        id: string;
        question_text: string;
        options: unknown;
        correct_option: number;
        marks: number;
      }>).map((q) => ({
        id: q.id,
        question_text: q.question_text,
        options: JSON.parse(JSON.stringify(q.options)) as string[],
        marks: q.marks,
        correct_option: showCorrect ? q.correct_option : null,
      })),
    };
  });

// ===================== SUBMIT ANSWERS =====================
export const submitDuelAnswers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        duelId: z.string().uuid(),
        answers: z
          .array(
            z.object({
              questionId: z.string().uuid(),
              selected: z.string().min(0).max(10),
              timeMs: z.number().int().min(0).max(600_000),
            }),
          )
          .min(1)
          .max(20),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const uid = context.userId;
    const { data: duel } = await supabaseAdmin
      .from("pvp_duels")
      .select("*")
      .eq("id", data.duelId)
      .maybeSingle();
    if (!duel) throw new Error("Duel not found");
    if (duel.challenger_id !== uid && duel.opponent_id !== uid) throw new Error("Not in duel");
    if (duel.status === "finished") throw new Error("Already finished");

    // Prevent double submission
    const { count } = await supabaseAdmin
      .from("pvp_duel_answers")
      .select("id", { count: "exact", head: true })
      .eq("duel_id", data.duelId)
      .eq("user_id", uid);
    if ((count ?? 0) > 0) throw new Error("You already submitted");

    const { data: questions } = await supabaseAdmin
      .from("questions")
      .select("id, correct_option")
      .in("id", data.answers.map((a) => a.questionId));

    let score = 0;
    const rows = data.answers.map((a) => {
      const q = questions?.find((x) => x.id === a.questionId);
      const correct = q && String(q.correct_option) === a.selected;
      if (correct) score += 1;
      return {
        duel_id: data.duelId,
        user_id: uid,
        question_id: a.questionId,
        selected: a.selected,
        is_correct: !!correct,
        time_ms: a.timeMs,
      };
    });
    await supabaseAdmin.from("pvp_duel_answers").insert(rows);

    const isChallenger = duel.challenger_id === uid;
    const updates: {
      updated_at: string;
      challenger_score?: number;
      opponent_score?: number;
      status?: string;
      winner_id?: string | null;
    } = { updated_at: new Date().toISOString() };
    if (isChallenger) updates.challenger_score = score;
    else updates.opponent_score = score;

    const otherDone = isChallenger
      ? duel.status === "opponent_done"
      : duel.status === "challenger_done";

    if (otherDone) {
      const cScore = isChallenger ? score : duel.challenger_score;
      const oScore = isChallenger ? duel.opponent_score : score;
      let winner: string | null = null;
      if (cScore > oScore) winner = duel.challenger_id;
      else if (oScore > cScore) winner = duel.opponent_id;
      updates.status = "finished";
      updates.winner_id = winner;
      if (winner) {
        await awardWinner(winner, duel.prize_coins, duel.prize_xp, "pvp_duel");
      }
    } else {
      updates.status = isChallenger ? "challenger_done" : "opponent_done";
    }

    await supabaseAdmin.from("pvp_duels").update(updates).eq("id", data.duelId);
    return { score, finished: !!otherDone };
  });
