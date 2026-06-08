import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { applyOverrides, totalTalentPoints, costForNextTier } from "@/lib/gamification/talents";

async function loadEffectiveTalents() {
  const { data } = await supabaseAdmin.from("talent_configs").select("*");
  return applyOverrides((data ?? []) as never);
}

async function loadUnlocked(userId: string): Promise<Record<string, number>> {
  const { data } = await supabaseAdmin
    .from("user_talents")
    .select("talent_code, tier")
    .eq("user_id", userId);
  const map: Record<string, number> = {};
  for (const row of data ?? []) map[row.talent_code] = row.tier;
  return map;
}

export const getTalentTree = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { data: stats } = await supabaseAdmin
      .from("gamification_stats")
      .select("level, talent_points_spent")
      .eq("user_id", userId)
      .maybeSingle();
    const level = stats?.level ?? 1;
    const spent = stats?.talent_points_spent ?? 0;
    const total = totalTalentPoints(level);
    const available = Math.max(0, total - spent);
    const unlocked = await loadUnlocked(userId);
    const effective = await loadEffectiveTalents();
    return {
      level,
      available,
      total,
      spent,
      talents: effective.map((t) => {
        const tier = unlocked[t.code] ?? 0;
        return {
          code: t.code,
          name: t.name,
          description: t.description,
          icon: t.icon,
          color: t.color,
          maxTier: t.maxTier,
          tier,
          nextCost: costForNextTier(t, tier),
          maxed: tier >= t.maxTier,
        };
      }),
    };
  });

export const unlockTalentTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const effective = await loadEffectiveTalents();
    const talent = effective.find((t) => t.code === data.code);
    if (!talent) throw new Error("Unknown talent");


    const { data: stats } = await supabaseAdmin
      .from("gamification_stats")
      .select("level, talent_points_spent")
      .eq("user_id", userId)
      .maybeSingle();
    const level = stats?.level ?? 1;
    const spent = stats?.talent_points_spent ?? 0;
    const available = Math.max(0, totalTalentPoints(level) - spent);

    const { data: existing } = await supabaseAdmin
      .from("user_talents")
      .select("tier")
      .eq("user_id", userId)
      .eq("talent_code", talent.code)
      .maybeSingle();
    const currentTier = existing?.tier ?? 0;
    if (currentTier >= talent.maxTier) throw new Error("Talent already maxed");

    const cost = talent.costPerTier[currentTier];
    if (available < cost) throw new Error("Not enough talent points");

    const newTier = currentTier + 1;
    if (existing) {
      await supabaseAdmin
        .from("user_talents")
        .update({ tier: newTier, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("talent_code", talent.code);
    } else {
      await supabaseAdmin
        .from("user_talents")
        .insert({ user_id: userId, talent_code: talent.code, tier: newTier });
    }
    await supabaseAdmin
      .from("gamification_stats")
      .update({ talent_points_spent: spent + cost, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    return { code: talent.code, tier: newTier, spent: spent + cost };
  });
