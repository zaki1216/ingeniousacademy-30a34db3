import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ROOM_QUESTIONS = 15;
const QUESTION_TIMEOUT_MS = 12_000;

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function awardWinner(userId: string, coins: number, xp: number) {
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
  await supabaseAdmin.from("coin_transactions").insert({ user_id: userId, amount: coins, reason: "br_winner" });
  await supabaseAdmin.from("xp_transactions").insert({ user_id: userId, amount: xp, reason: "br_winner" });
}

// ========== CREATE ROOM ==========
export const createBrRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: questions } = await supabaseAdmin
      .from("questions")
      .select("id")
      .limit(200);
    if (!questions || questions.length < ROOM_QUESTIONS) throw new Error("Not enough questions");
    const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, ROOM_QUESTIONS);

    const { data: room, error } = await supabaseAdmin
      .from("pvp_br_rooms")
      .insert({ code: genCode(), host_id: context.userId })
      .select("id, code")
      .single();
    if (error) throw error;

    await supabaseAdmin.from("pvp_br_questions").insert(
      shuffled.map((q, i) => ({ room_id: room.id, question_id: q.id, order_index: i })),
    );
    await supabaseAdmin
      .from("pvp_br_players")
      .insert({ room_id: room.id, user_id: context.userId });

    return { id: room.id, code: room.code };
  });

// ========== LIST OPEN ROOMS ==========
export const listOpenBrRooms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
  const { data } = await supabaseAdmin
    .from("pvp_br_rooms")
    .select("id, code, status, prize_coins, prize_xp, created_at")
    .in("status", ["waiting", "active"])
    .order("created_at", { ascending: false })
    .limit(20);
  const ids = (data ?? []).map((r) => r.id);
  const counts: Record<string, number> = {};
  if (ids.length) {
    const { data: players } = await supabaseAdmin
      .from("pvp_br_players")
      .select("room_id")
      .in("room_id", ids);
    for (const p of players ?? []) counts[p.room_id] = (counts[p.room_id] ?? 0) + 1;
  }
  return (data ?? []).map((r) => ({ ...r, player_count: counts[r.id] ?? 0 }));
});

// ========== JOIN ==========
export const joinBrRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().min(4).max(12) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: room } = await supabaseAdmin
      .from("pvp_br_rooms")
      .select("*")
      .eq("code", data.code.toUpperCase())
      .maybeSingle();
    if (!room) throw new Error("Room not found");
    if (room.status === "finished") throw new Error("Room finished");

    const { count } = await supabaseAdmin
      .from("pvp_br_players")
      .select("id", { count: "exact", head: true })
      .eq("room_id", room.id);
    if ((count ?? 0) >= room.max_players) throw new Error("Room full");

    await supabaseAdmin
      .from("pvp_br_players")
      .upsert(
        { room_id: room.id, user_id: context.userId },
        { onConflict: "room_id,user_id", ignoreDuplicates: true },
      );
    return { id: room.id };
  });

// ========== ROOM STATE ==========
export const getBrRoom = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: room } = await supabaseAdmin
      .from("pvp_br_rooms")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!room) throw new Error("Room not found");

    const { data: players } = await supabaseAdmin
      .from("pvp_br_players")
      .select("*")
      .eq("room_id", data.id);

    const ids = (players ?? []).map((p) => p.user_id);
    const { data: profs } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, name").in("id", ids)
      : { data: [] };

    let currentQuestion = null as null | {
      id: string;
      question_text: string;
      options: string[];
      order_index: number;
    };
    if (room.status === "active" && room.current_question_index >= 0) {
      const { data: qrow } = await supabaseAdmin
        .from("pvp_br_questions")
        .select("question_id, order_index")
        .eq("room_id", data.id)
        .eq("order_index", room.current_question_index)
        .maybeSingle();
      if (qrow) {
        const { data: q } = await supabaseAdmin
          .from("questions")
          .select("id, question_text, options")
          .eq("id", qrow.question_id)
          .maybeSingle();
        if (q) {
          currentQuestion = {
            id: q.id,
            question_text: q.question_text,
            options: JSON.parse(JSON.stringify(q.options)) as string[],
            order_index: qrow.order_index,
          };
        }
      }
    }

    return {
      id: room.id,
      code: room.code,
      status: room.status,
      host_id: room.host_id,
      isHost: room.host_id === context.userId,
      current_question_index: room.current_question_index,
      prize_coins: room.prize_coins,
      prize_xp: room.prize_xp,
      winner_id: room.winner_id,
      players: (players ?? []).map((p) => ({
        user_id: p.user_id,
        name:
          profs?.find((x) => x.id === p.user_id)?.name ||
          profs?.find((x) => x.id === p.user_id)?.email ||
          "Player",
        eliminated: p.eliminated,
        eliminated_at_index: p.eliminated_at_index,
        finish_place: p.finish_place,
        score: p.score,
        isMe: p.user_id === context.userId,
      })),
      currentQuestion,
    };
  });

// ========== START (host) ==========
export const startBrRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: room } = await supabaseAdmin
      .from("pvp_br_rooms")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!room) throw new Error("Room not found");
    if (room.host_id !== context.userId) throw new Error("Only host can start");
    if (room.status !== "waiting") throw new Error("Already started");
    await supabaseAdmin
      .from("pvp_br_rooms")
      .update({
        status: "active",
        current_question_index: 0,
        started_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    return { ok: true };
  });

// ========== NEXT QUESTION (host) ==========
export const advanceBrRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: room } = await supabaseAdmin
      .from("pvp_br_rooms")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!room) throw new Error("Room not found");
    if (room.host_id !== context.userId) throw new Error("Only host can advance");
    if (room.status !== "active") throw new Error("Not active");

    // Count remaining
    const { data: alive } = await supabaseAdmin
      .from("pvp_br_players")
      .select("user_id")
      .eq("room_id", data.id)
      .eq("eliminated", false);

    const { count: total } = await supabaseAdmin
      .from("pvp_br_questions")
      .select("id", { count: "exact", head: true })
      .eq("room_id", data.id);

    const next = room.current_question_index + 1;
    if ((alive?.length ?? 0) <= 1 || next >= (total ?? 0)) {
      const winner = alive && alive.length === 1 ? alive[0].user_id : null;
      await supabaseAdmin
        .from("pvp_br_rooms")
        .update({
          status: "finished",
          winner_id: winner,
          finished_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      if (winner) {
        await supabaseAdmin
          .from("pvp_br_players")
          .update({ finish_place: 1 })
          .eq("room_id", data.id)
          .eq("user_id", winner);
        await awardWinner(winner, room.prize_coins, room.prize_xp);
      }
      return { finished: true };
    }
    await supabaseAdmin
      .from("pvp_br_rooms")
      .update({ current_question_index: next })
      .eq("id", data.id);
    return { finished: false, index: next };
  });

// ========== ANSWER ==========
export const answerBrQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        roomId: z.string().uuid(),
        orderIndex: z.number().int().min(0).max(99),
        selected: z.string().min(0).max(10),
        timeMs: z.number().int().min(0).max(QUESTION_TIMEOUT_MS + 5_000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: room } = await supabaseAdmin
      .from("pvp_br_rooms")
      .select("status, current_question_index")
      .eq("id", data.roomId)
      .maybeSingle();
    if (!room) throw new Error("Room not found");
    if (room.status !== "active") throw new Error("Room not active");
    if (room.current_question_index !== data.orderIndex)
      throw new Error("Out of sync");

    const { data: player } = await supabaseAdmin
      .from("pvp_br_players")
      .select("*")
      .eq("room_id", data.roomId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!player) throw new Error("Not in this room");
    if (player.eliminated) throw new Error("Already eliminated");

    const { data: qrow } = await supabaseAdmin
      .from("pvp_br_questions")
      .select("question_id")
      .eq("room_id", data.roomId)
      .eq("order_index", data.orderIndex)
      .maybeSingle();
    if (!qrow) throw new Error("Question missing");
    const { data: q } = await supabaseAdmin
      .from("questions")
      .select("correct_option")
      .eq("id", qrow.question_id)
      .maybeSingle();
    const correct = q && String(q.correct_option) === data.selected;

    if (correct) {
      await supabaseAdmin
        .from("pvp_br_players")
        .update({ score: (player.score ?? 0) + 1 })
        .eq("id", player.id);
      return { correct: true };
    }

    // Find current alive count to set finish_place
    const { data: aliveList } = await supabaseAdmin
      .from("pvp_br_players")
      .select("user_id")
      .eq("room_id", data.roomId)
      .eq("eliminated", false);
    const place = aliveList?.length ?? 1;

    await supabaseAdmin
      .from("pvp_br_players")
      .update({
        eliminated: true,
        eliminated_at_index: data.orderIndex,
        finish_place: place,
      })
      .eq("id", player.id);
    return { correct: false, finish_place: place };
  });
