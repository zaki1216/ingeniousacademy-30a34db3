import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("user_id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

/** Percentage helper for offline marks. */
function pct(obtained: number, max: number): number {
  if (!max || max <= 0) return 0;
  return Math.round((obtained / max) * 1000) / 10;
}

// Class-wide analytics dashboard — offline assessments + lecture activity only.
export const adminGetOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    const [
      { data: studentsRoles },
      { data: profiles },
      { data: marks },
      { data: offlineTests },
      { data: views },
      { data: lectures },
      { data: chapters },
      { data: subjects },
      { data: attendance },
    ] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id").eq("role", "student"),
      supabaseAdmin.from("profiles").select("id, name, email, standard_id, is_active"),
      supabaseAdmin.from("offline_marks").select("student_id, offline_test_id, marks_obtained, created_at"),
      supabaseAdmin.from("offline_tests").select("id, title, subject_id, chapter_id, max_marks, test_date"),
      supabaseAdmin.from("video_completions").select("lecture_id, user_id, watch_count"),
      supabaseAdmin.from("lectures").select("id, lecture_title, lecture_number, chapter_id"),
      supabaseAdmin.from("chapters").select("id, chapter_name, chapter_number, subject_id"),
      supabaseAdmin.from("subjects").select("id, subject_name"),
      supabaseAdmin.from("attendance").select("student_id, status, date"),
    ]);

    const studentIds = new Set((studentsRoles ?? []).map((r) => r.user_id));
    const totalStudents = studentIds.size;
    const activeStudents = (profiles ?? []).filter((p) => studentIds.has(p.id) && p.is_active !== false).length;

    const testById = new Map((offlineTests ?? []).map((t) => [t.id, t]));

    // per offline test averages
    const perTest = new Map<string, { sum: number; n: number }>();
    for (const m of marks ?? []) {
      const t = testById.get(m.offline_test_id);
      if (!t) continue;
      const cur = perTest.get(m.offline_test_id) ?? { sum: 0, n: 0 };
      cur.sum += pct(Number(m.marks_obtained ?? 0), Number(t.max_marks ?? 0));
      cur.n += 1;
      perTest.set(m.offline_test_id, cur);
    }
    const testStats = (offlineTests ?? []).map((t) => {
      const s = perTest.get(t.id);
      return {
        id: t.id,
        title: t.title,
        attempts: s?.n ?? 0,
        avg_percentage: s ? Math.round((s.sum / s.n) * 10) / 10 : 0,
      };
    }).sort((a, b) => b.attempts - a.attempts);

    const overallAvg = (() => {
      const all = (marks ?? []).map((m) => {
        const t = testById.get(m.offline_test_id);
        return t ? pct(Number(m.marks_obtained ?? 0), Number(t.max_marks ?? 0)) : null;
      }).filter((x): x is number => x !== null);
      if (all.length === 0) return 0;
      return Math.round((all.reduce((s, x) => s + x, 0) / all.length) * 10) / 10;
    })();

    // most-watched lectures
    const lecAgg = new Map<string, { viewers: Set<string>; totalWatches: number }>();
    for (const v of views ?? []) {
      const cur = lecAgg.get(v.lecture_id) ?? { viewers: new Set<string>(), totalWatches: 0 };
      cur.viewers.add(v.user_id);
      cur.totalWatches += v.watch_count ?? 1;
      lecAgg.set(v.lecture_id, cur);
    }
    const topLectures = (lectures ?? []).map((l) => {
      const ch = chapters?.find((c) => c.id === l.chapter_id);
      const sub = subjects?.find((s) => s.id === ch?.subject_id);
      const a = lecAgg.get(l.id);
      return {
        id: l.id,
        title: l.lecture_title,
        chapter: ch ? `${sub?.subject_name ?? ""} · Ch ${ch.chapter_number}` : "—",
        viewers: a?.viewers.size ?? 0,
        totalWatches: a?.totalWatches ?? 0,
      };
    }).sort((a, b) => b.totalWatches - a.totalWatches).slice(0, 10);

    // attendance rate
    const attN = attendance?.length ?? 0;
    const attP = (attendance ?? []).filter((a) => a.status === "present").length;
    const attendanceRate = attN > 0 ? Math.round((attP / attN) * 1000) / 10 : 0;

    return {
      totals: {
        totalStudents,
        activeStudents,
        totalAttempts: marks?.length ?? 0,
        overallAvg,
        attendanceRate,
        totalLectures: lectures?.length ?? 0,
        totalTests: offlineTests?.length ?? 0,
      },
      testStats: testStats.slice(0, 15),
      topLectures,
    };
  });

// Per-student report card — offline assessments + lecture activity.
export const adminGetStudentReportCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ studentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const studentId = data.studentId;

    const [
      { data: profile },
      { data: stats },
      { data: marks },
      { data: offlineTests },
      { data: chapters },
      { data: subjects },
      { data: views },
      { data: attendance },
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, name, email, phone, standard_id").eq("id", studentId).maybeSingle(),
      supabaseAdmin.from("gamification_stats").select("*").eq("user_id", studentId).maybeSingle(),
      supabaseAdmin.from("offline_marks").select("id, offline_test_id, marks_obtained, created_at").eq("student_id", studentId).order("created_at", { ascending: false }),
      supabaseAdmin.from("offline_tests").select("id, title, subject_id, chapter_id, max_marks, test_date"),
      supabaseAdmin.from("chapters").select("id, chapter_name, chapter_number, subject_id"),
      supabaseAdmin.from("subjects").select("id, subject_name, standard_id"),
      supabaseAdmin.from("video_completions").select("lecture_id, watch_count, last_watched_at, completed_at").eq("user_id", studentId),
      supabaseAdmin.from("attendance").select("date, status").eq("student_id", studentId),
    ]);

    const attN = attendance?.length ?? 0;
    const attP = (attendance ?? []).filter((a) => a.status === "present").length;
    const attendancePct = attN > 0 ? Math.round((attP / attN) * 1000) / 10 : 0;

    const testRows = (marks ?? []).map((m) => {
      const t = offlineTests?.find((x) => x.id === m.offline_test_id);
      const ch = chapters?.find((c) => c.id === t?.chapter_id);
      const sub = subjects?.find((s) => s.id === (t?.subject_id ?? ch?.subject_id));
      return {
        result_id: m.id,
        test_title: t?.title ?? "—",
        subject: sub?.subject_name ?? "—",
        chapter: ch?.chapter_name ?? "—",
        chapter_id: ch?.id ?? null,
        score: Number(m.marks_obtained ?? 0),
        total: Number(t?.max_marks ?? 0),
        percentage: pct(Number(m.marks_obtained ?? 0), Number(t?.max_marks ?? 0)),
        attempt_date: t?.test_date ?? m.created_at,
      };
    });

    const testAvg = testRows.length > 0
      ? Math.round((testRows.reduce((s, r) => s + r.percentage, 0) / testRows.length) * 10) / 10
      : 0;

    // weak chapters: avg per chapter < 50
    const perChapter = new Map<string, { name: string; subject: string; sum: number; n: number }>();
    for (const r of testRows) {
      if (!r.chapter_id) continue;
      const cur = perChapter.get(r.chapter_id) ?? { name: r.chapter, subject: r.subject, sum: 0, n: 0 };
      cur.sum += r.percentage;
      cur.n += 1;
      perChapter.set(r.chapter_id, cur);
    }
    const weakChapters = Array.from(perChapter.entries())
      .map(([id, v]) => ({ id, name: v.name, subject: v.subject, avg: Math.round((v.sum / v.n) * 10) / 10, attempts: v.n }))
      .filter((x) => x.avg < 50)
      .sort((a, b) => a.avg - b.avg);

    const totalWatches = (views ?? []).reduce((s, v) => s + (v.watch_count ?? 1), 0);
    const lecturesWatched = views?.length ?? 0;

    return {
      profile,
      stats,
      attendance: { total: attN, present: attP, percentage: attendancePct },
      tests: { rows: testRows, average: testAvg, count: testRows.length },
      lectures: { unique: lecturesWatched, totalWatches },
      weakChapters,
    };
  });
