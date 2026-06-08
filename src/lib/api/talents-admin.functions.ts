import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { TALENTS } from "@/lib/gamification/talents";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listTalentConfigs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: configs } = await supabaseAdmin
      .from("talent_configs")
      .select("*");
    const byCode = new Map((configs ?? []).map((c) => [c.talent_code, c]));
    return TALENTS.map((t) => {
      const cfg = byCode.get(t.code);
      const perTier =
        t.effect.kind === "xp_multiplier" || t.effect.kind === "coin_multiplier"
          ? t.effect.perTier
          : (t.effect as { perTier: number }).perTier;
      return {
        code: t.code,
        name: t.name,
        icon: t.icon,
        effectKind: t.effect.kind,
        defaults: {
          maxTier: t.maxTier,
          costPerTier: t.costPerTier,
          perTierValue: perTier,
        },
        override: cfg
          ? {
              maxTier: cfg.max_tier,
              costPerTier: cfg.cost_per_tier,
              perTierValue: Number(cfg.per_tier_value),
              updatedAt: cfg.updated_at,
            }
          : null,
      };
    });
  });

export const updateTalentConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        code: z.string().min(1).max(64),
        maxTier: z.number().int().min(1).max(20),
        costPerTier: z.array(z.number().int().min(0).max(99)).min(1).max(20),
        perTierValue: z.number().min(0).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.costPerTier.length !== data.maxTier) {
      throw new Error("costPerTier length must equal maxTier");
    }
    if (!TALENTS.find((t) => t.code === data.code)) {
      throw new Error("Unknown talent code");
    }

    const { data: existing } = await supabaseAdmin
      .from("talent_configs")
      .select("*")
      .eq("talent_code", data.code)
      .maybeSingle();

    const newRow = {
      talent_code: data.code,
      max_tier: data.maxTier,
      cost_per_tier: data.costPerTier,
      per_tier_value: data.perTierValue,
      updated_by: context.userId,
    };

    if (existing) {
      await supabaseAdmin
        .from("talent_configs")
        .update(newRow)
        .eq("talent_code", data.code);
    } else {
      await supabaseAdmin.from("talent_configs").insert(newRow);
    }

    await supabaseAdmin.from("talent_audit_log").insert({
      talent_code: data.code,
      admin_user_id: context.userId,
      action: existing ? "update" : "create",
      old_value: existing
        ? {
            max_tier: existing.max_tier,
            cost_per_tier: existing.cost_per_tier,
            per_tier_value: existing.per_tier_value,
          }
        : null,
      new_value: {
        max_tier: data.maxTier,
        cost_per_tier: data.costPerTier,
        per_tier_value: data.perTierValue,
      },
    });

    return { ok: true };
  });

export const resetTalentConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: existing } = await supabaseAdmin
      .from("talent_configs")
      .select("*")
      .eq("talent_code", data.code)
      .maybeSingle();
    if (!existing) return { ok: true };
    await supabaseAdmin
      .from("talent_configs")
      .delete()
      .eq("talent_code", data.code);
    await supabaseAdmin.from("talent_audit_log").insert({
      talent_code: data.code,
      admin_user_id: context.userId,
      action: "reset",
      old_value: {
        max_tier: existing.max_tier,
        cost_per_tier: existing.cost_per_tier,
        per_tier_value: existing.per_tier_value,
      },
      new_value: null,
    });
    return { ok: true };
  });

export const getTalentAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("talent_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    const adminIds = Array.from(
      new Set((data ?? []).map((r) => r.admin_user_id).filter(Boolean)),
    ) as string[];
    const profiles = adminIds.length
      ? (
          await supabaseAdmin
            .from("profiles")
            .select("id, name, email")
            .in("id", adminIds)
        ).data ?? []
      : [];
    const nameOf = (id: string | null) =>
      profiles.find((p) => p.id === id)?.name ??
      profiles.find((p) => p.id === id)?.email ??
      "Unknown";
    return (data ?? []).map((r) => ({
      id: r.id,
      talent_code: r.talent_code,
      action: r.action,
      admin_name: nameOf(r.admin_user_id),
      old_value: r.old_value,
      new_value: r.new_value,
      created_at: r.created_at,
    }));
  });
