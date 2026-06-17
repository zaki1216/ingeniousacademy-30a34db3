import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SPIN_PRIZES, pickWeighted } from "@/lib/rpg/spin";

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export const getSpinStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const [lastTodayRes, historyRes] = await Promise.all([
      supabaseAdmin
        .from("daily_spins")
        .select("id, prize_label, reward_type, reward_amount, rarity, streak, created_at")
        .eq("user_id", userId)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(1),
      supabaseAdmin
        .from("daily_spins")
        .select("id, prize_label, reward_type, reward_amount, rarity, streak, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    const spunToday = (lastTodayRes.data ?? []).length > 0;
    return {
      spunToday,
      lastSpin: lastTodayRes.data?.[0] ?? null,
      history: historyRes.data ?? [],
      prizes: SPIN_PRIZES,
    };
  });

export const doSpin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);

    // enforce one spin per UTC day
    const { data: existing } = await supabaseAdmin
      .from("daily_spins")
      .select("id, prize_label, reward_type, reward_amount, rarity")
      .eq("user_id", userId)
      .gte("created_at", since.toISOString())
      .limit(1);
    if (existing && existing.length) {
      return { alreadyClaimed: true, prize: null, spin: existing[0] };
    }

    // compute streak (consecutive prior UTC days with a spin)
    const lookback = new Date();
    lookback.setUTCDate(lookback.getUTCDate() - 30);
    const { data: recent } = await supabaseAdmin
      .from("daily_spins")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", lookback.toISOString())
      .order("created_at", { ascending: false });
    const days = new Set(
      (recent ?? []).map((r) => new Date(r.created_at).toISOString().slice(0, 10))
    );
    let streak = 1;
    const cursor = new Date();
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    while (days.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    // pick a prize
    const prize = pickWeighted();

    // apply reward
    const { data: stats } = await supabaseAdmin
      .from("gamification_stats")
      .select("coins, xp")
      .eq("user_id", userId)
      .maybeSingle();
    if (!stats) {
      await supabaseAdmin.from("gamification_stats").insert({ user_id: userId });
    }
    const curCoins = stats?.coins ?? 0;
    const curXp = stats?.xp ?? 0;

    if (prize.type === "coins") {
      await supabaseAdmin
        .from("gamification_stats")
        .update({ coins: curCoins + prize.amount, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      await supabaseAdmin.from("coin_transactions").insert({
        user_id: userId,
        amount: prize.amount,
        reason: "daily_spin",
        metadata: { prize: prize.id },
      });
    } else if (prize.type === "xp") {
      await supabaseAdmin
        .from("gamification_stats")
        .update({ xp: curXp + prize.amount, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      await supabaseAdmin.from("xp_transactions").insert({
        user_id: userId,
        amount: prize.amount,
        reason: "daily_spin",
        metadata: { prize: prize.id },
      });
    }
    // keys / badges / passes / shadows / pets are recorded in daily_spins; ownership
    // surfaces in inventory via the spin log (acts as the reward ledger).

    const { data: spin } = await supabaseAdmin
      .from("daily_spins")
      .insert({
        user_id: userId,
        reward_type: prize.type,
        reward_value: prize.value,
        reward_amount: prize.amount,
        prize_label: prize.label,
        rarity: prize.rarity,
        streak,
      })
      .select()
      .single();

    return { alreadyClaimed: false, prize, spin, streak, date: todayUTC() };
  });
