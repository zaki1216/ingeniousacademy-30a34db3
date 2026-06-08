import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { chestRewardForDay, CHEST_CYCLE_DAYS } from "@/lib/gamification/chestRewards";

export const getChestStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { data: stats } = await supabaseAdmin
      .from("gamification_stats")
      .select("chest_cycle_day, last_chest_claim_date")
      .eq("user_id", userId)
      .maybeSingle();
    const today = new Date().toISOString().slice(0, 10);
    const claimedToday = stats?.last_chest_claim_date === today;
    const currentDay = stats?.chest_cycle_day ?? 0;
    const nextDay = claimedToday ? currentDay : ((currentDay % CHEST_CYCLE_DAYS) + 1);
    return {
      claimedToday,
      currentDay,
      nextDay,
      nextReward: chestRewardForDay(nextDay),
      todayReward: claimedToday ? chestRewardForDay(currentDay) : null,
    };
  });

export const claimDailyChest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const today = new Date().toISOString().slice(0, 10);
    const { data: stats } = await supabaseAdmin
      .from("gamification_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (!stats) {
      // ensure row
      await supabaseAdmin.from("gamification_stats").insert({ user_id: userId });
    }
    const cur = stats ?? { chest_cycle_day: 0, last_chest_claim_date: null as string | null, coins: 0 };
    if (cur.last_chest_claim_date === today) {
      return { alreadyClaimed: true, reward: chestRewardForDay(cur.chest_cycle_day), newCoins: cur.coins };
    }
    const nextDay = (cur.chest_cycle_day % CHEST_CYCLE_DAYS) + 1;
    const reward = chestRewardForDay(nextDay);
    const newCoins = (cur.coins ?? 0) + reward.coins;
    await supabaseAdmin
      .from("gamification_stats")
      .update({
        coins: newCoins,
        chest_cycle_day: nextDay,
        last_chest_claim_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    await supabaseAdmin.from("coin_transactions").insert({
      user_id: userId,
      amount: reward.coins,
      reason: "daily_chest",
      metadata: { day: nextDay, rarity: reward.rarity },
    });
    return { alreadyClaimed: false, reward, newCoins, day: nextDay };
  });
