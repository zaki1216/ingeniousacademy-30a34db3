import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PASSES, getPass } from "@/lib/rpg/passes";

type LimitWindow = "weekly" | "monthly" | "none";

function windowStart(kind: LimitWindow): Date | null {
  if (kind === "none") return null;
  const d = new Date();
  if (kind === "weekly") {
    const day = d.getDay(); // 0 = Sun
    const diff = (day + 6) % 7; // Monday start
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (kind === "monthly") {
    return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  }
  return null;
}

export const getPassShop = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [statsRes, passesRes] = await Promise.all([
      supabase.from("gamification_stats").select("coins").eq("user_id", userId).maybeSingle(),
      supabase
        .from("user_passes")
        .select("id, pass_code, status, created_at, approved_at, used_at, expires_at, cost_coins, notes")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    const owned = passesRes.data ?? [];
    const coins = statsRes.data?.coins ?? 0;

    // Compute per-pass availability/limit status
    const catalog = PASSES.map((p) => {
      let usedInWindow = 0;
      let nextAvailable: string | null = null;
      if (p.limit.kind !== "none") {
        const start = windowStart(p.limit.kind);
        if (start) {
          const inWindow = owned.filter(
            (o) =>
              o.pass_code === p.code &&
              new Date(o.created_at) >= start &&
              o.status !== "refunded",
          );
          usedInWindow = inWindow.length;
          if (usedInWindow >= p.limit.count) {
            const next =
              p.limit.kind === "weekly"
                ? new Date(start.getTime() + 7 * 86400000)
                : new Date(start.getFullYear(), start.getMonth() + 1, 1);
            nextAvailable = next.toISOString();
          }
        }
      }
      return {
        ...p,
        usedInWindow,
        atLimit: p.limit.kind !== "none" && usedInWindow >= p.limit.count,
        nextAvailable,
        canAfford: coins >= p.costCoins,
      };
    });

    return { coins, catalog, owned };
  });

export const purchasePass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ passCode: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const pass = getPass(data.passCode);
    if (!pass) throw new Error("Unknown pass");

    // Check coin balance via authenticated client (RLS scopes to user)
    const { data: stats, error: statsErr } = await supabase
      .from("gamification_stats")
      .select("coins")
      .eq("user_id", userId)
      .maybeSingle();
    if (statsErr) throw statsErr;
    const coins = stats?.coins ?? 0;
    if (coins < pass.costCoins) throw new Error("Not enough coins");

    // Enforce limits server-side
    if (pass.limit.kind !== "none") {
      const start = windowStart(pass.limit.kind);
      if (start) {
        const { count } = await supabase
          .from("user_passes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("pass_code", pass.code)
          .gte("created_at", start.toISOString());
        if ((count ?? 0) >= pass.limit.count) {
          throw new Error(
            `Limit reached: ${pass.limit.count} ${pass.code} per ${pass.limit.kind === "weekly" ? "week" : "month"}`,
          );
        }
      }
    }

    // Use admin to debit coins + record the transaction atomically-ish
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const newCoins = coins - pass.costCoins;
    const { error: updateErr } = await supabaseAdmin
      .from("gamification_stats")
      .update({ coins: newCoins, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (updateErr) throw updateErr;

    await supabaseAdmin.from("coin_transactions").insert({
      user_id: userId,
      amount: -pass.costCoins,
      reason: "pass_purchase",
      metadata: { pass_code: pass.code, pass_name: pass.name },
    });

    const expiresAt = pass.durationHours
      ? new Date(Date.now() + pass.durationHours * 3600 * 1000).toISOString()
      : null;

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("user_passes")
      .insert({
        user_id: userId,
        pass_code: pass.code,
        cost_coins: pass.costCoins,
        status: pass.requiresApproval ? "pending_approval" : "active",
        expires_at: expiresAt,
      })
      .select("id, status")
      .single();
    if (insertErr) throw insertErr;

    return { ok: true, pass: inserted, newCoins };
  });
