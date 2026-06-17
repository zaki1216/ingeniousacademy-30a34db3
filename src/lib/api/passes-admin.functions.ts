import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("user_id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Forbidden: admin only");
}

export const adminListPasses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        status: z
          .enum(["pending_approval", "active", "approved", "rejected", "used", "expired", "all"])
          .default("pending_approval"),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);

    let q = supabase
      .from("user_passes")
      .select(
        "id, user_id, pass_code, status, cost_coins, created_at, approved_at, used_at, expires_at, notes",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: passes, error } = await q;
    if (error) throw error;

    const userIds = Array.from(new Set((passes ?? []).map((p) => p.user_id)));
    let profiles: Record<string, { name: string | null; email: string | null }> = {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);
      for (const p of profs ?? []) profiles[p.id] = { name: p.name, email: p.email };
    }

    return {
      passes: (passes ?? []).map((p) => ({
        ...p,
        student_name: profiles[p.user_id]?.name ?? null,
        student_email: profiles[p.user_id]?.email ?? null,
      })),
    };
  });

export const adminDecidePass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        passId: z.string().uuid(),
        decision: z.enum(["approve", "reject"]),
        reason: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);

    const { data: existing, error: fetchErr } = await supabase
      .from("user_passes")
      .select("id, status, user_id, pass_code, cost_coins")
      .eq("id", data.passId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) throw new Error("Pass not found");
    if (existing.status !== "pending_approval")
      throw new Error(`Cannot decide pass with status: ${existing.status}`);

    const newStatus = data.decision === "approve" ? "approved" : "rejected";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: updErr } = await supabaseAdmin
      .from("user_passes")
      .update({
        status: newStatus,
        approved_by: userId,
        approved_at: new Date().toISOString(),
        notes: data.reason ?? null,
      })
      .eq("id", data.passId);
    if (updErr) throw updErr;

    // Refund coins on rejection
    if (data.decision === "reject" && existing.cost_coins > 0) {
      const { data: stats } = await supabaseAdmin
        .from("gamification_stats")
        .select("coins")
        .eq("user_id", existing.user_id)
        .maybeSingle();
      const newCoins = (stats?.coins ?? 0) + existing.cost_coins;
      await supabaseAdmin
        .from("gamification_stats")
        .update({ coins: newCoins, updated_at: new Date().toISOString() })
        .eq("user_id", existing.user_id);
      await supabaseAdmin.from("coin_transactions").insert({
        user_id: existing.user_id,
        amount: existing.cost_coins,
        reason: "pass_refund",
        metadata: { pass_id: data.passId, pass_code: existing.pass_code },
      });
    }

    await supabase.from("pass_audit_log").insert({
      pass_id: data.passId,
      admin_user_id: userId,
      action: data.decision,
      reason: data.reason ?? null,
      prev_status: existing.status,
      new_status: newStatus,
      metadata: { pass_code: existing.pass_code, refunded: data.decision === "reject" },
    });

    return { ok: true, newStatus };
  });

export const adminListPassAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);

    const { data: logs, error } = await supabase
      .from("pass_audit_log")
      .select(
        "id, pass_id, admin_user_id, action, reason, prev_status, new_status, metadata, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw error;

    const adminIds = Array.from(
      new Set((logs ?? []).map((l) => l.admin_user_id).filter(Boolean) as string[]),
    );
    const passIds = Array.from(new Set((logs ?? []).map((l) => l.pass_id)));

    const [adminsRes, passesRes] = await Promise.all([
      adminIds.length
        ? supabase.from("profiles").select("id, name, email").in("id", adminIds)
        : Promise.resolve({ data: [] as any[] }),
      passIds.length
        ? supabase
            .from("user_passes")
            .select("id, user_id, pass_code")
            .in("id", passIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const adminMap: Record<string, { name: string | null; email: string | null }> = {};
    for (const a of adminsRes.data ?? []) adminMap[a.id] = { name: a.name, email: a.email };
    const passMap: Record<string, { user_id: string; pass_code: string }> = {};
    for (const p of passesRes.data ?? [])
      passMap[p.id] = { user_id: p.user_id, pass_code: p.pass_code };

    const studentIds = Array.from(new Set(Object.values(passMap).map((p) => p.user_id)));
    let studentMap: Record<string, { name: string | null }> = {};
    if (studentIds.length) {
      const { data: studs } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", studentIds);
      for (const s of studs ?? []) studentMap[s.id] = { name: s.name };
    }

    return {
      logs: (logs ?? []).map((l) => {
        const passInfo = passMap[l.pass_id];
        return {
          ...l,
          admin_name: l.admin_user_id ? adminMap[l.admin_user_id]?.name ?? null : null,
          pass_code: passInfo?.pass_code ?? null,
          student_name: passInfo ? studentMap[passInfo.user_id]?.name ?? null : null,
        };
      }),
    };
  });
