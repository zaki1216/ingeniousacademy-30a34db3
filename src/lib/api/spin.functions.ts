import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type SpinPrize = {
  id: string;
  code: string;
  label: string;
  icon: string;
  color: string;
  type: "coins" | "xp" | "key" | "badge" | "pass" | "shadow" | "pet";
  value: string;
  amount: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  weight: number;
};

async function loadPrizes(includeDisabled = false): Promise<SpinPrize[]> {
  let q = supabaseAdmin
    .from("spin_prize_configs")
    .select("id, code, label, icon, color, reward_type, reward_value, reward_amount, rarity, weight, enabled, sort_order")
    .order("sort_order");
  if (!includeDisabled) q = q.eq("enabled", true);
  const { data } = await q;
  return (data ?? []).map((r) => ({
    id: r.code,
    code: r.code,
    label: r.label,
    icon: r.icon,
    color: r.color,
    type: r.reward_type as SpinPrize["type"],
    value: r.reward_value,
    amount: r.reward_amount,
    rarity: r.rarity as SpinPrize["rarity"],
    weight: Number(r.weight),
  }));
}

function pickWeighted(prizes: SpinPrize[]): SpinPrize {
  const total = prizes.reduce((s, p) => s + Math.max(0, p.weight), 0);
  if (total <= 0) return prizes[0];
  let r = Math.random() * total;
  for (const p of prizes) {
    r -= Math.max(0, p.weight);
    if (r <= 0) return p;
  }
  return prizes[prizes.length - 1];
}

function utcDayStart(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export const getSpinStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const since = utcDayStart();
    const [lastTodayRes, historyRes, prizes] = await Promise.all([
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
      loadPrizes(false),
    ]);
    const spunToday = (lastTodayRes.data ?? []).length > 0;
    // Next UTC midnight (ms epoch) for client-side countdown
    const nextReset = new Date();
    nextReset.setUTCHours(24, 0, 0, 0);
    return {
      spunToday,
      lastSpin: lastTodayRes.data?.[0] ?? null,
      history: historyRes.data ?? [],
      prizes,
      nextResetAt: nextReset.toISOString(),
    };
  });

export const doSpin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const since = utcDayStart();

    // Quick pre-check (best-effort) — final guarantee is the UNIQUE INDEX below.
    const { data: existing } = await supabaseAdmin
      .from("daily_spins")
      .select("id, prize_label, reward_type, reward_amount, rarity, streak, created_at")
      .eq("user_id", userId)
      .gte("created_at", since.toISOString())
      .limit(1);
    if (existing && existing.length) {
      return { alreadyClaimed: true as const, prize: null, spin: existing[0] };
    }

    // Compute consecutive-day streak from prior UTC days
    const lookback = new Date();
    lookback.setUTCDate(lookback.getUTCDate() - 30);
    const { data: recent } = await supabaseAdmin
      .from("daily_spins")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", lookback.toISOString())
      .order("created_at", { ascending: false });
    const days = new Set(
      (recent ?? []).map((r) => new Date(r.created_at).toISOString().slice(0, 10)),
    );
    let streak = 1;
    const cursor = new Date();
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    while (days.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    const prizes = await loadPrizes(false);
    if (!prizes.length) throw new Error("No spin prizes are configured. Ask an admin.");
    const prize = pickWeighted(prizes);

    // Race-safe insert FIRST — unique index on (user_id, UTC day) blocks doubles.
    const { data: spin, error: insertErr } = await supabaseAdmin
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

    if (insertErr) {
      // 23505 = unique_violation → another concurrent spin won the race
      if ((insertErr as { code?: string }).code === "23505") {
        const { data: now } = await supabaseAdmin
          .from("daily_spins")
          .select("id, prize_label, reward_type, reward_amount, rarity, streak, created_at")
          .eq("user_id", userId)
          .gte("created_at", since.toISOString())
          .limit(1);
        return { alreadyClaimed: true as const, prize: null, spin: now?.[0] ?? null };
      }
      throw insertErr;
    }

    // Apply reward only AFTER the insert succeeded
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
        metadata: { prize: prize.code },
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
        metadata: { prize: prize.code },
      });
    }

    return { alreadyClaimed: false as const, prize, spin, streak };
  });

// ---------- Admin ----------

async function requireAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("user_id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const adminListSpinPrizes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("spin_prize_configs")
      .select("*")
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  weight: z.number().min(0).max(1000).optional(),
  enabled: z.boolean().optional(),
  reward_amount: z.number().int().min(0).optional(),
  label: z.string().min(1).max(60).optional(),
  icon: z.string().min(1).max(8).optional(),
  color: z.string().min(1).max(64).optional(),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).optional(),
  sort_order: z.number().int().optional(),
});

export const adminUpdateSpinPrize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin
      .from("spin_prize_configs")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

export const adminBulkUpdateWeights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      updates: z.array(z.object({ id: z.string().uuid(), weight: z.number().min(0).max(1000) })).max(50),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    for (const u of data.updates) {
      const { error } = await supabaseAdmin
        .from("spin_prize_configs")
        .update({ weight: u.weight, updated_at: new Date().toISOString() })
        .eq("id", u.id);
      if (error) throw error;
    }
    return { ok: true, count: data.updates.length };
  });
