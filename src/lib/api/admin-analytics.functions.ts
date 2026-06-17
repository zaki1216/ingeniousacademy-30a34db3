import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("user_id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

// Class-wide analytics dashboard
export const adminGetOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    const [
      { data: studentsRoles },
      { data: profiles },
      { data: results },
      { data: tests },
      { data: views },
      { data: lectures },
      { data: chapters },
      { data: subjects },
      { data: questions },
      { data: attendance },
    ] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id").eq("role", "student"),
      supabaseAdmin.from("profiles").select("id, name, email, standard_id, is_active"),
      supabaseAdmin.from("results").select("student_id, test_id, percentage, score, total_marks, answers, attempt_date"),
      supabaseAdmin.from("tests").select("id, title, chapter_id, total_marks"),
      supabaseAdmin.from("video_completions").select("lecture_id, user_id, watch_count"),
      supabaseAdmin.from("lectures").select("id, lecture_title, lecture_number, chapter_id"),
      supabaseAdmin.from("chapters").select("id, chapter_name, chapter_number, subject_id"),
      supabaseAdmin.from("subjects").select("id, subject_name"),
      supabaseAdmin.from("questions").select("id, test_id, question_text, correct_option"),
      supabaseAdmin.from("attendance").select("student_id, status, date"),
    ]);

    const studentIds = new Set((studentsRoles ?? []).map((r) => r.user_id));
    const totalStudents = studentIds.size;
    const activeStudents = (profiles ?? []).filter((p) => studentIds.has(p.id) && p.is_active !== false).length;

    // class-wide test averages
    const perTest = new Map<string, { sum: number; n: number }>();
    for (const r of results ?? []) {
      const cur = perTest.get(r.test_id) ?? { sum: 0, n: 0 };
      cur.sum += Number(r.percentage ?? 0);
      cur.n += 1;
      perTest.set(r.test_id, cur);
    }
    const testStats = (tests ?? []).map((t) => {
      const s = perTest.get(t.id);
      return {
        id: t.id,
        title: t.title,
        attempts: s?.n ?? 0,
        avg_percentage: s ? Math.round((s.sum / s.n) * 10) / 10 : 0,
      };
    }).sort((a, b) => b.attempts - a.attempts);

    const overallAvg = (() => {
      const all = (results ?? []).map((r) => Number(r.percentage ?? 0));
      if (all.length === 0) return 0;
      return Math.round((all.reduce((s, x) => s + x, 0) / all.length) * 10) / 10;
    })();

    // most-watched lectures
    const lecAgg = new Map<string, { viewers: Set<string>; totalWatches: number }>();
    for (const v of views ?? []) {
      const cur = lecAgg.get(v.lecture_id) ?? { viewers: new Set(), totalWatches: 0 };
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

    // hardest questions: % wrong across results.answers (answers stored per-question map)
    const qStats = new Map<string, { right: number; total: number }>();
    for (const r of results ?? []) {
      const ans = (r.answers as Record<string, number> | null) ?? {};
      for (const [qid, picked] of Object.entries(ans)) {
        const q = questions?.find((x) => x.id === qid);
        if (!q) continue;
        const cur = qStats.get(qid) ?? { right: 0, total: 0 };
        cur.total += 1;
        if (Number(picked) === q.correct_option) cur.right += 1;
        qStats.set(qid, cur);
      }
    }
    const hardestQuestions = Array.from(qStats.entries())
      .map(([qid, s]) => {
        const q = questions?.find((x) => x.id === qid)!;
        const t = tests?.find((x) => x.id === q.test_id);
        return {
          id: qid,
          question_text: q.question_text,
          test_title: t?.title ?? "—",
          correct_pct: s.total > 0 ? Math.round((s.right / s.total) * 1000) / 10 : 0,
          attempts: s.total,
        };
      })
      .filter((x) => x.attempts >= 1)
      .sort((a, b) => a.correct_pct - b.correct_pct)
      .slice(0, 10);

    // attendance rate
    const attN = attendance?.length ?? 0;
    const attP = (attendance ?? []).filter((a) => a.status === "present").length;
    const attendanceRate = attN > 0 ? Math.round((attP / attN) * 1000) / 10 : 0;

    return {
      totals: {
        totalStudents,
        activeStudents,
        totalAttempts: results?.length ?? 0,
        overallAvg,
        attendanceRate,
        totalLectures: lectures?.length ?? 0,
        totalTests: tests?.length ?? 0,
      },
      testStats: testStats.slice(0, 15),
      topLectures,
      hardestQuestions,
    };
  });

// Per-student report card
export const adminGetStudentReportCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ studentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const studentId = data.studentId;

    const [
      { data: profile },
      { data: stats },
      { data: results },
      { data: tests },
      { data: chapters },
      { data: subjects },
      { data: views },
      { data: attendance },
      { data: questions },
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, name, email, phone, standard_id").eq("id", studentId).maybeSingle(),
      supabaseAdmin.from("gamification_stats").select("*").eq("user_id", studentId).maybeSingle(),
      supabaseAdmin.from("results").select("id, test_id, percentage, score, total_marks, attempt_date, answers").eq("student_id", studentId).order("attempt_date", { ascending: false }),
      supabaseAdmin.from("tests").select("id, title, chapter_id, total_marks"),
      supabaseAdmin.from("chapters").select("id, chapter_name, chapter_number, subject_id"),
      supabaseAdmin.from("subjects").select("id, subject_name, standard_id"),
      supabaseAdmin.from("video_completions").select("lecture_id, watch_count, last_watched_at, completed_at").eq("user_id", studentId),
      supabaseAdmin.from("attendance").select("date, status").eq("student_id", studentId),
      supabaseAdmin.from("questions").select("id, test_id, correct_option"),
    ]);

    const attN = attendance?.length ?? 0;
    const attP = (attendance ?? []).filter((a) => a.status === "present").length;
    const attendancePct = attN > 0 ? Math.round((attP / attN) * 1000) / 10 : 0;

    const testRows = (results ?? []).map((r) => {
      const t = tests?.find((x) => x.id === r.test_id);
      const ch = chapters?.find((c) => c.id === t?.chapter_id);
      const sub = subjects?.find((s) => s.id === ch?.subject_id);
      return {
        result_id: r.id,
        test_title: t?.title ?? "—",
        subject: sub?.subject_name ?? "—",
        chapter: ch?.chapter_name ?? "—",
        chapter_id: ch?.id ?? null,
        score: r.score,
        total: r.total_marks,
        percentage: Number(r.percentage ?? 0),
        attempt_date: r.attempt_date,
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
