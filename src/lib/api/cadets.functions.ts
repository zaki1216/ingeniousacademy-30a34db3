import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles").select("user_id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

export const adminListCadets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const [{ data: roles }, { data: standards }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id").eq("role", "student"),
      supabaseAdmin.from("standards").select("id, name").order("display_order"),
    ]);
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) return { cadets: [], standards: standards ?? [] };
    const [{ data: profiles }, { data: stats }, { data: att }] = await Promise.all([
      supabaseAdmin.from("profiles")
        .select("id, name, email, phone, standard_id, is_active, created_at")
        .in("id", ids).order("name"),
      supabaseAdmin.from("gamification_stats")
        .select("user_id, xp, level, coins, streak_days")
        .in("user_id", ids),
      supabaseAdmin.from("attendance").select("student_id, status").in("student_id", ids),
    ]);
    const statMap = new Map((stats ?? []).map((s) => [s.user_id, s]));
    const attMap = new Map<string, { p: number; t: number }>();
    for (const a of att ?? []) {
      const cur = attMap.get(a.student_id) ?? { p: 0, t: 0 };
      cur.t += 1;
      if (a.status === "present") cur.p += 1;
      attMap.set(a.student_id, cur);
    }
    const cadets = (profiles ?? []).map((p) => {
      const s = statMap.get(p.id);
      const a = attMap.get(p.id) ?? { p: 0, t: 0 };
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        standard_id: p.standard_id,
        is_active: p.is_active !== false,
        created_at: p.created_at,
        xp: s?.xp ?? 0,
        level: s?.level ?? 1,
        coins: s?.coins ?? 0,
        streak_days: s?.streak_days ?? 0,
        attendance_present: a.p,
        attendance_total: a.t,
      };
    });
    return { cadets, standards: standards ?? [] };
  });

export const adminSetCadetActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), isActive: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("profiles").update({ is_active: data.isActive }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateCadet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    userId: z.string().uuid(),
    name: z.string().min(1).optional(),
    phone: z.string().nullable().optional(),
    parent_phone: z.string().nullable().optional(),
    standard_id: z.string().uuid().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { userId, ...patch } = data;
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCadet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
