import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("user_id").eq("user_id", userId).eq("role", "admin").maybeSingle();
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

// ---- Student quiz history ----
export const adminGetStudentQuizHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [attemptsRes, resultsRes] = await Promise.all([
      supabaseAdmin
        .from("quiz_attempts")
        .select("id, test_id, lecture_id, correct_count, total_questions, coins_awarded, created_at")
        .eq("student_id", data.userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("results")
        .select("id, test_id, score, total_marks, percentage, attempt_date")
        .eq("student_id", data.userId)
        .order("attempt_date", { ascending: false }),
    ]);

    const attempts = attemptsRes.data ?? [];
    const results = resultsRes.data ?? [];

    const testIds = Array.from(new Set([
      ...attempts.map((a) => a.test_id),
      ...results.map((r) => r.test_id),
    ]));
    const lectureIds = Array.from(new Set(attempts.map((a) => a.lecture_id).filter(Boolean) as string[]));

    const [testsRes, lecturesRes] = await Promise.all([
      testIds.length
        ? supabaseAdmin.from("tests").select("id, title, kind, passing_marks, marks_per_question, total_marks, chapter_id, lecture_id").in("id", testIds)
        : Promise.resolve({ data: [] as any[] }),
      lectureIds.length
        ? supabaseAdmin.from("lectures").select("id, title, chapter_id").in("id", lectureIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const tests = testsRes.data ?? [];
    const lectures = lecturesRes.data ?? [];

    const chapterIds = Array.from(new Set([
      ...tests.map((t: any) => t.chapter_id).filter(Boolean),
      ...lectures.map((l: any) => l.chapter_id).filter(Boolean),
    ]));
    const chaptersRes = chapterIds.length
      ? await supabaseAdmin.from("chapters").select("id, title, subject_id").in("id", chapterIds)
      : { data: [] as any[] };
    const chapters = chaptersRes.data ?? [];

    const subjectIds = Array.from(new Set(chapters.map((c: any) => c.subject_id).filter(Boolean)));
    const subjectsRes = subjectIds.length
      ? await supabaseAdmin.from("subjects").select("id, name").in("id", subjectIds)
      : { data: [] as any[] };
    const subjects = subjectsRes.data ?? [];

    const testById = new Map(tests.map((t: any) => [t.id, t]));
    const lectureById = new Map(lectures.map((l: any) => [l.id, l]));
    const chapterById = new Map(chapters.map((c: any) => [c.id, c]));
    const subjectById = new Map(subjects.map((s: any) => [s.id, s]));

    function context(testId: string, lectureId: string | null) {
      const t: any = testById.get(testId);
      const lec: any = lectureId ? lectureById.get(lectureId) : (t?.lecture_id ? lectureById.get(t.lecture_id) : null);
      const chapId = lec?.chapter_id ?? t?.chapter_id;
      const chap: any = chapId ? chapterById.get(chapId) : null;
      const subj: any = chap?.subject_id ? subjectById.get(chap.subject_id) : null;
      return {
        testTitle: t?.title ?? "Quiz",
        kind: t?.kind ?? "test",
        lectureTitle: lec?.title ?? null,
        chapterTitle: chap?.title ?? null,
        subjectName: subj?.name ?? null,
      };
    }

    type Row = {
      type: "lecture_quiz" | "test";
      testId: string;
      testTitle: string;
      kind: string;
      lectureTitle: string | null;
      chapterTitle: string | null;
      subjectName: string | null;
      attempts: Array<{
        id: string;
        date: string;
        score: number;
        totalMarks: number;
        percentage: number;
        passed: boolean | null;
        passingMarks: number | null;
        coinsAwarded?: number;
      }>;
    };

    const rowsByTest = new Map<string, Row>();

    for (const a of attempts) {
      const t: any = testById.get(a.test_id);
      const mpq = t?.marks_per_question ?? 1;
      const score = (a.correct_count ?? 0) * mpq;
      const totalMarks = t?.total_marks ?? (a.total_questions ?? 0) * mpq;
      const pass = t?.passing_marks ?? 0;
      const ctx = context(a.test_id, a.lecture_id);
      const row = rowsByTest.get(a.test_id) ?? {
        type: "lecture_quiz",
        testId: a.test_id, ...ctx, attempts: [],
      } as Row;
      row.attempts.push({
        id: a.id,
        date: a.created_at,
        score,
        totalMarks,
        percentage: totalMarks ? Math.round((score / totalMarks) * 1000) / 10 : 0,
        passed: pass > 0 ? score >= pass : null,
        passingMarks: pass > 0 ? pass : null,
        coinsAwarded: a.coins_awarded ?? 0,
      });
      rowsByTest.set(a.test_id, row);
    }

    for (const r of results) {
      const ctx = context(r.test_id, null);
      const row = rowsByTest.get(r.test_id) ?? {
        type: "test",
        testId: r.test_id, ...ctx, attempts: [],
      } as Row;
      row.attempts.push({
        id: r.id,
        date: r.attempt_date,
        score: Number(r.score),
        totalMarks: Number(r.total_marks),
        percentage: Number(r.percentage),
        passed: null,
        passingMarks: null,
      });
      rowsByTest.set(r.test_id, row);
    }

    const rows = Array.from(rowsByTest.values()).map((r) => {
      r.attempts.sort((a, b) => +new Date(b.date) - +new Date(a.date));
      return r;
    }).sort((a, b) => +new Date(b.attempts[0]?.date ?? 0) - +new Date(a.attempts[0]?.date ?? 0));

    return {
      totalAttempts: attempts.length + results.length,
      quizzesAttempted: rows.length,
      rows,
    };
  });
