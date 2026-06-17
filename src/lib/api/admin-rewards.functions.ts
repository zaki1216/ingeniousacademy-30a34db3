import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

async function adjustCoins(userId: string, amount: number, reason: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: stats } = await supabaseAdmin
    .from("gamification_stats").select("coins").eq("user_id", userId).maybeSingle();
  const current = stats?.coins ?? 0;
  const next = Math.max(0, current + amount);
  if (stats) {
    await supabaseAdmin.from("gamification_stats")
      .update({ coins: next, updated_at: new Date().toISOString() }).eq("user_id", userId);
  } else {
    await supabaseAdmin.from("gamification_stats").insert({ user_id: userId, coins: next });
  }
  await supabaseAdmin.from("coin_transactions").insert({
    user_id: userId, amount, reason, metadata: { admin: true },
  });
}

export const adminAwardCoins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    userId: z.string().uuid(), amount: z.number().int(), reason: z.string().default("admin_award"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    await adjustCoins(data.userId, data.amount, data.reason);
    return { ok: true };
  });

export const adminAwardBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    userId: z.string().uuid(), achievementId: z.string().uuid(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_achievements")
      .upsert({ user_id: data.userId, achievement_id: data.achievementId }, { onConflict: "user_id,achievement_id" });
    return { ok: true };
  });

export const adminAwardTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    userId: z.string().uuid(), titleCode: z.string(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_titles")
      .upsert({ user_id: data.userId, title_code: data.titleCode }, { onConflict: "user_id,title_code" });
    return { ok: true };
  });

export const adminGrantPass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    userId: z.string().uuid(), passCode: z.string(), expiresAt: z.string().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_passes").insert({
      user_id: data.userId, pass_code: data.passCode, cost_coins: 0,
      status: "approved", approved_by: context.userId, approved_at: new Date().toISOString(),
      expires_at: data.expiresAt ?? null,
    });
    return { ok: true };
  });

export const adminUnlockShadow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    userId: z.string().uuid(), shadowCode: z.string(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_shadows")
      .upsert({ user_id: data.userId, shadow_code: data.shadowCode }, { onConflict: "user_id,shadow_code" });
    return { ok: true };
  });

// ---- Bulk ----
export const adminBulkAwardCoins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    standardId: z.string().uuid().nullable(), amount: z.number().int(),
    reason: z.string().default("bulk_award"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = supabaseAdmin.from("profiles").select("id").eq("is_active", true);
    const { data: profs } = data.standardId ? await q.eq("standard_id", data.standardId) : await q;
    const { data: roleRows } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "student");
    const studentSet = new Set((roleRows ?? []).map((r) => r.user_id));
    const ids = (profs ?? []).map((p) => p.id).filter((id) => studentSet.has(id));
    for (const id of ids) await adjustCoins(id, data.amount, data.reason);
    return { ok: true, count: ids.length };
  });

export const adminBulkAwardBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    standardId: z.string().uuid().nullable(), achievementId: z.string().uuid(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = supabaseAdmin.from("profiles").select("id").eq("is_active", true);
    const { data: profs } = data.standardId ? await q.eq("standard_id", data.standardId) : await q;
    const { data: roleRows } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "student");
    const studentSet = new Set((roleRows ?? []).map((r) => r.user_id));
    const ids = (profs ?? []).map((p) => p.id).filter((id) => studentSet.has(id));
    if (ids.length) {
      await supabaseAdmin.from("user_achievements").upsert(
        ids.map((user_id) => ({ user_id, achievement_id: data.achievementId })),
        { onConflict: "user_id,achievement_id" },
      );
    }
    return { ok: true, count: ids.length };
  });

export const adminResetSeasonRewards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ seasonId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("season_progress").delete().eq("season_id", data.seasonId);
    return { ok: true };
  });

// ---- Command center data ----
export const adminGetStudentCommandCenter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = data.userId;
    const [profile, stats, att, ach, titles, passes, shadows] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, name, email, standard_id").eq("id", uid).maybeSingle(),
      supabaseAdmin.from("gamification_stats").select("*").eq("user_id", uid).maybeSingle(),
      supabaseAdmin.from("attendance").select("status, date").eq("student_id", uid),
      supabaseAdmin.from("user_achievements").select("achievement:achievements(code,name,icon)").eq("user_id", uid),
      supabaseAdmin.from("user_titles").select("title:titles(code,name,rarity)").eq("user_id", uid),
      supabaseAdmin.from("user_passes").select("id, pass_code, status, expires_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("user_shadows").select("shadow:shadows(code,name,icon,rarity)").eq("user_id", uid),
    ]);
    const presentDays = (att.data ?? []).filter((a) => a.status === "present").length;
    return {
      profile: profile.data,
      stats: stats.data,
      attendance: { present: presentDays, total: att.data?.length ?? 0 },
      achievements: ach.data ?? [],
      titles: titles.data ?? [],
      passes: passes.data ?? [],
      shadows: shadows.data ?? [],
    };
  });

export const adminGetCommandCenterOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = new Date().toISOString().slice(0, 10);
    const sinceIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const [todayAtt, pendingPasses, topStudents, recentXp, pendingTests, recentResults] = await Promise.all([
      supabaseAdmin.from("attendance").select("status").eq("date", today),
      supabaseAdmin.from("user_passes").select("id, user_id, pass_code, created_at, profiles:user_id(name)").eq("status", "pending").order("created_at", { ascending: false }).limit(10),
      supabaseAdmin.from("gamification_stats").select("user_id, xp, level, coins, profiles:user_id(name)").order("xp", { ascending: false }).limit(5),
      supabaseAdmin.from("xp_transactions").select("user_id, amount, reason, created_at, profiles:user_id(name)").gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(15),
      supabaseAdmin.from("tests").select("id, title").order("created_at", { ascending: false }).limit(5),
      supabaseAdmin.from("results").select("id, student_id, test_id, percentage, created_at").gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(20),
    ]);
    const present = (todayAtt.data ?? []).filter((a) => a.status === "present").length;
    const total = todayAtt.data?.length ?? 0;
    return {
      attendance: { present, total, rate: total ? Math.round((present / total) * 100) : 0 },
      pendingPasses: pendingPasses.data ?? [],
      topStudents: topStudents.data ?? [],
      recentActivity: recentXp.data ?? [],
      pendingTests: pendingTests.data ?? [],
      recentResultsCount: recentResults.data?.length ?? 0,
    };
  });
