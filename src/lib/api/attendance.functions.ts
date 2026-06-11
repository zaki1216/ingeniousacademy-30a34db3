import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PRESENT_REWARD = 4;
const ABSENT_PENALTY = -2;

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
}

export const markAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    studentId: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(["present", "absent"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const newDelta = data.status === "present" ? PRESENT_REWARD : ABSENT_PENALTY;

    const { data: existing } = await supabaseAdmin
      .from("attendance")
      .select("id, status, coins_delta")
      .eq("student_id", data.studentId)
      .eq("date", data.date)
      .maybeSingle();

    const oldDelta = existing?.coins_delta ?? 0;
    const diff = newDelta - oldDelta;

    if (existing) {
      await supabaseAdmin.from("attendance").update({
        status: data.status, coins_delta: newDelta, marked_by: context.userId,
      }).eq("id", existing.id);
    } else {
      await supabaseAdmin.from("attendance").insert({
        student_id: data.studentId, date: data.date, status: data.status,
        coins_delta: newDelta, marked_by: context.userId,
      });
    }

    if (diff !== 0) {
      // Ensure stats row exists
      const { data: stats } = await supabaseAdmin
        .from("gamification_stats").select("coins").eq("user_id", data.studentId).maybeSingle();
      if (!stats) {
        await supabaseAdmin.from("gamification_stats").insert({ user_id: data.studentId, coins: Math.max(0, diff) });
      } else {
        await supabaseAdmin.from("gamification_stats").update({
          coins: Math.max(0, stats.coins + diff), updated_at: new Date().toISOString(),
        }).eq("user_id", data.studentId);
      }
      await supabaseAdmin.from("coin_transactions").insert({
        user_id: data.studentId,
        amount: diff,
        reason: data.status === "present" ? "attendance_present" : "attendance_absent",
        metadata: { date: data.date, attendance_status: data.status },
      });
    }

    return { ok: true };
  });

export const resetAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    studentId: z.string().uuid().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    let q = supabaseAdmin.from("attendance").select("id, student_id, coins_delta").eq("date", data.date);
    if (data.studentId) q = q.eq("student_id", data.studentId);
    const { data: rows } = await q;
    if (!rows || rows.length === 0) return { ok: true, cleared: 0 };

    for (const r of rows) {
      const revert = -(r.coins_delta ?? 0);
      if (revert !== 0) {
        const { data: stats } = await supabaseAdmin
          .from("gamification_stats").select("coins").eq("user_id", r.student_id).maybeSingle();
        if (stats) {
          await supabaseAdmin.from("gamification_stats").update({
            coins: Math.max(0, stats.coins + revert), updated_at: new Date().toISOString(),
          }).eq("user_id", r.student_id);
        } else if (revert > 0) {
          await supabaseAdmin.from("gamification_stats").insert({ user_id: r.student_id, coins: revert });
        }
        await supabaseAdmin.from("coin_transactions").insert({
          user_id: r.student_id,
          amount: revert,
          reason: "attendance_reset",
          metadata: { date: data.date, reverted_delta: r.coins_delta },
        });
      }
      await supabaseAdmin.from("attendance").delete().eq("id", r.id);
    }

    return { ok: true, cleared: rows.length };
  });



export const getAttendanceForDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    standardId: z.string().uuid().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin.from("profiles")
      .select("id, name, email, standard_id")
      .eq("is_active", true)
      .order("name");
    if (data.standardId) q = q.eq("standard_id", data.standardId);
    const { data: students } = await q;
    const studentIds = (students ?? []).map((s) => s.id);
    // Only students (not admins)
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("user_id, role").in("user_id", studentIds.length ? studentIds : ["00000000-0000-0000-0000-000000000000"]);
    const studentSet = new Set((roles ?? []).filter((r) => r.role === "student").map((r) => r.user_id));
    const filtered = (students ?? []).filter((s) => studentSet.has(s.id));

    const { data: attRows } = await supabaseAdmin
      .from("attendance").select("student_id, status").eq("date", data.date);
    const attMap = new Map((attRows ?? []).map((r) => [r.student_id, r.status]));

    return {
      students: filtered.map((s) => ({
        id: s.id, name: s.name, email: s.email,
        status: (attMap.get(s.id) as "present" | "absent" | undefined) ?? null,
      })),
    };
  });

export const getAttendanceHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ days: z.number().min(1).max(180).default(30) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const since = new Date();
    since.setDate(since.getDate() - data.days);
    const sinceDate = since.toISOString().slice(0, 10);
    const { data: rows } = await supabaseAdmin
      .from("attendance")
      .select("id, date, status, coins_delta, student:profiles!attendance_student_id_fkey(id, name, email)")
      .gte("date", sinceDate)
      .order("date", { ascending: false })
      .limit(500);
    return { rows: rows ?? [] };
  });

export const getMyAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("attendance")
      .select("id, date, status, coins_delta")
      .eq("student_id", context.userId)
      .order("date", { ascending: false })
      .limit(180);
    return { rows: data ?? [] };
  });

export const getAttendanceLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { data: me } = await supabaseAdmin
      .from("profiles").select("standard_id").eq("id", userId).maybeSingle();
    if (!me?.standard_id) return { rows: [], myRank: null };

    const { data: classmates } = await supabaseAdmin
      .from("profiles").select("id, name").eq("standard_id", me.standard_id).eq("is_active", true);
    const ids = (classmates ?? []).map((c) => c.id);
    if (ids.length === 0) return { rows: [], myRank: null };

    const { data: attRows } = await supabaseAdmin
      .from("attendance")
      .select("student_id, date, status")
      .in("student_id", ids)
      .order("date", { ascending: false });

    const byUser = new Map<string, { date: string; status: string }[]>();
    for (const r of attRows ?? []) {
      const arr = byUser.get(r.student_id) ?? [];
      arr.push({ date: r.date, status: r.status });
      byUser.set(r.student_id, arr);
    }

    const computeStreaks = (rows: { date: string; status: string }[]) => {
      const ordered = [...rows].sort((a, b) => a.date.localeCompare(b.date));
      let best = 0, run = 0;
      for (const r of ordered) {
        if (r.status === "present") { run++; if (run > best) best = run; }
        else run = 0;
      }
      let current = 0;
      for (const r of rows) {
        if (r.status === "present") current++;
        else break;
      }
      return { best, current };
    };

    const rows = (classmates ?? []).map((c) => {
      const userRows = byUser.get(c.id) ?? [];
      const present = userRows.filter((r) => r.status === "present").length;
      const absent = userRows.filter((r) => r.status === "absent").length;
      const total = present + absent;
      const { best, current } = computeStreaks(userRows);
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;
      return {
        user_id: c.id,
        name: c.name,
        present,
        absent,
        total,
        percentage: pct,
        currentStreak: current,
        bestStreak: best,
      };
    });

    rows.sort((a, b) => {
      if (b.present !== a.present) return b.present - a.present;
      if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
      if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
      return b.percentage - a.percentage;
    });

    const ranked = rows.map((r, i) => ({ ...r, rank: i + 1, isMe: r.user_id === userId }));
    const myRank = ranked.find((r) => r.isMe)?.rank ?? null;
    return { rows: ranked.slice(0, 50), myRank };
  });
