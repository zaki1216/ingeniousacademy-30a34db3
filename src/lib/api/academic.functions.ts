import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("user_id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

// ----------------- Admin: Offline tests CRUD -----------------

export const adminListOfflineTests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: tests } = await context.supabase
      .from("offline_tests")
      .select("*")
      .order("test_date", { ascending: false });
    return { tests: tests ?? [] };
  });

export const adminCreateOfflineTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      title: z.string().min(1).max(200),
      subject_id: z.string().uuid(),
      chapter_id: z.string().uuid().nullable().optional(),
      max_marks: z.number().int().positive(),
      test_date: z.string().min(1),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("offline_tests")
      .insert({ ...data, chapter_id: data.chapter_id ?? null, created_by: context.userId })
      .select()
      .single();
    if (error) throw error;
    return { test: row };
  });

export const adminUpdateOfflineTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      title: z.string().min(1),
      subject_id: z.string().uuid(),
      chapter_id: z.string().uuid().nullable().optional(),
      max_marks: z.number().int().positive(),
      test_date: z.string().min(1),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    const { error } = await context.supabase
      .from("offline_tests")
      .update({ ...rest, chapter_id: rest.chapter_id ?? null })
      .eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

export const adminDeleteOfflineTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("offline_tests").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ----------------- Admin: Marks entry -----------------

export const adminGetMarksSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ offlineTestId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabase } = context;

    const { data: test } = await supabase.from("offline_tests").select("*").eq("id", data.offlineTestId).maybeSingle();
    if (!test) throw new Error("Test not found");

    const { data: subject } = await supabase.from("subjects").select("standard_id, subject_name").eq("id", test.subject_id).maybeSingle();

    // Students in the standard
    const { data: students } = subject?.standard_id
      ? await supabase.from("profiles").select("id, name, email").eq("standard_id", subject.standard_id).order("name")
      : { data: [] as Array<{ id: string; name: string | null; email: string | null }> };

    const { data: marks } = await supabase
      .from("offline_marks")
      .select("student_id, marks_obtained, remarks")
      .eq("offline_test_id", data.offlineTestId);

    const map = new Map((marks ?? []).map((m) => [m.student_id, m]));
    const rows = (students ?? []).map((s) => ({
      student_id: s.id,
      name: s.name ?? "—",
      email: s.email ?? "",
      marks_obtained: map.get(s.id)?.marks_obtained ?? null,
      remarks: map.get(s.id)?.remarks ?? "",
    }));
    return { test, subject, rows };
  });

export const adminUpsertMarks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      offlineTestId: z.string().uuid(),
      marks: z.array(
        z.object({
          student_id: z.string().uuid(),
          marks_obtained: z.number().min(0),
          remarks: z.string().max(500).optional().nullable(),
        }),
      ),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const rows = data.marks.map((m) => ({
      offline_test_id: data.offlineTestId,
      student_id: m.student_id,
      marks_obtained: m.marks_obtained,
      remarks: m.remarks ?? null,
      entered_by: context.userId,
    }));
    if (rows.length === 0) return { ok: true, count: 0 };
    const { error } = await context.supabase
      .from("offline_marks")
      .upsert(rows, { onConflict: "offline_test_id,student_id" });
    if (error) throw error;
    return { ok: true, count: rows.length };
  });

export const adminSetReportCardRemarks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      student_id: z.string().uuid(),
      term: z.string().min(1).max(50).default("overall"),
      remarks: z.string().min(1).max(2000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("report_card_remarks")
      .upsert(
        { ...data, updated_by: context.userId },
        { onConflict: "student_id,term" },
      );
    if (error) throw error;
    return { ok: true };
  });

// ----------------- Student: Report card -----------------

export const getMyReportCard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase.from("profiles").select("standard_id, name").eq("id", userId).maybeSingle();
    const standardId = profile?.standard_id;

    // All offline tests in this student's standard
    const { data: subjects } = standardId
      ? await supabase.from("subjects").select("id, subject_name").eq("standard_id", standardId)
      : { data: [] as { id: string; subject_name: string }[] };
    const subjectIds = (subjects ?? []).map((s) => s.id);

    const { data: tests } = subjectIds.length
      ? await supabase.from("offline_tests").select("*").in("subject_id", subjectIds)
      : { data: [] as any[] };
    const testIds = (tests ?? []).map((t) => t.id);

    const { data: marks } = testIds.length
      ? await supabase.from("offline_marks").select("*").eq("student_id", userId).in("offline_test_id", testIds)
      : { data: [] as any[] };

    const { data: chapters } = await supabase.from("chapters").select("id, chapter_name, chapter_number, subject_id");

    // Per-subject and per-chapter aggregation for THIS student
    const subjAgg = new Map<string, { obtained: number; max: number; subject_name: string }>();
    const chapAgg = new Map<string, { obtained: number; max: number; chapter_name: string; subject_name: string }>();
    const rows: Array<any> = [];

    for (const t of tests ?? []) {
      const m = (marks ?? []).find((x) => x.offline_test_id === t.id);
      const subject = (subjects ?? []).find((s) => s.id === t.subject_id);
      const chapter = (chapters ?? []).find((c) => c.id === t.chapter_id);
      const obtained = m?.marks_obtained != null ? Number(m.marks_obtained) : null;
      rows.push({
        id: t.id,
        title: t.title,
        subject_name: subject?.subject_name ?? "—",
        chapter_name: chapter?.chapter_name ?? null,
        test_date: t.test_date,
        max_marks: t.max_marks,
        marks_obtained: obtained,
        percentage: obtained != null ? Math.round((obtained / t.max_marks) * 10000) / 100 : null,
      });
      if (obtained == null) continue;
      const sKey = t.subject_id;
      const sc = subjAgg.get(sKey) ?? { obtained: 0, max: 0, subject_name: subject?.subject_name ?? "—" };
      sc.obtained += obtained; sc.max += t.max_marks;
      subjAgg.set(sKey, sc);
      if (chapter) {
        const ck = chapter.id;
        const cc = chapAgg.get(ck) ?? { obtained: 0, max: 0, chapter_name: chapter.chapter_name, subject_name: subject?.subject_name ?? "—" };
        cc.obtained += obtained; cc.max += t.max_marks;
        chapAgg.set(ck, cc);
      }
    }

    const subjects_summary = Array.from(subjAgg.entries()).map(([id, v]) => ({
      subject_id: id,
      subject_name: v.subject_name,
      obtained: v.obtained,
      max: v.max,
      percentage: v.max > 0 ? Math.round((v.obtained / v.max) * 10000) / 100 : 0,
    }));
    const chapters_summary = Array.from(chapAgg.entries()).map(([id, v]) => ({
      chapter_id: id,
      chapter_name: v.chapter_name,
      subject_name: v.subject_name,
      obtained: v.obtained,
      max: v.max,
      percentage: v.max > 0 ? Math.round((v.obtained / v.max) * 10000) / 100 : 0,
    }));

    const totalObtained = subjects_summary.reduce((s, x) => s + x.obtained, 0);
    const totalMax = subjects_summary.reduce((s, x) => s + x.max, 0);
    const overallPercentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0;

    // Academic rank within standard
    let academicRank: number | null = null;
    let cohortSize = 0;
    if (standardId) {
      const { data: cohort } = await supabase.from("profiles").select("id").eq("standard_id", standardId);
      const cohortIds = (cohort ?? []).map((p) => p.id);
      cohortSize = cohortIds.length;
      if (testIds.length && cohortIds.length) {
        const { data: allMarks } = await supabase
          .from("offline_marks")
          .select("student_id, marks_obtained, offline_test_id")
          .in("offline_test_id", testIds)
          .in("student_id", cohortIds);
        const maxMap = new Map((tests ?? []).map((t) => [t.id, t.max_marks]));
        const perStudent = new Map<string, { o: number; m: number }>();
        for (const r of allMarks ?? []) {
          const cur = perStudent.get(r.student_id) ?? { o: 0, m: 0 };
          cur.o += Number(r.marks_obtained);
          cur.m += maxMap.get(r.offline_test_id) ?? 0;
          perStudent.set(r.student_id, cur);
        }
        const pcts = Array.from(perStudent.entries()).map(([sid, v]) => ({
          sid, pct: v.m > 0 ? v.o / v.m : 0,
        }));
        pcts.sort((a, b) => b.pct - a.pct);
        const myIdx = pcts.findIndex((p) => p.sid === userId);
        academicRank = myIdx >= 0 ? myIdx + 1 : null;
      }
    }

    const { data: remarks } = await supabase
      .from("report_card_remarks")
      .select("term, remarks, updated_at")
      .eq("student_id", userId)
      .order("updated_at", { ascending: false });

    return {
      profile: { name: profile?.name ?? "Hunter" },
      overallPercentage,
      totalObtained,
      totalMax,
      academicRank,
      cohortSize,
      subjects_summary,
      chapters_summary,
      rows,
      remarks: remarks ?? [],
    };
  });

// ----------------- Scholar leaderboard -----------------

export const getScholarLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: me } = await supabase.from("profiles").select("standard_id").eq("id", userId).maybeSingle();
    const standardId = me?.standard_id;
    if (!standardId) return { rows: [], myRank: null };

    const { data: subjects } = await supabase.from("subjects").select("id").eq("standard_id", standardId);
    const subjectIds = (subjects ?? []).map((s) => s.id);
    const { data: tests } = subjectIds.length
      ? await supabase.from("offline_tests").select("id, max_marks").in("subject_id", subjectIds)
      : { data: [] as any[] };
    const testIds = (tests ?? []).map((t) => t.id);
    const maxMap = new Map((tests ?? []).map((t) => [t.id, t.max_marks]));

    const { data: cohort } = await supabase.from("profiles").select("id, name").eq("standard_id", standardId);
    const cohortIds = (cohort ?? []).map((c) => c.id);
    if (!testIds.length || !cohortIds.length) return { rows: [], myRank: null };

    const { data: allMarks } = await supabase
      .from("offline_marks")
      .select("student_id, marks_obtained, offline_test_id")
      .in("offline_test_id", testIds)
      .in("student_id", cohortIds);

    const perStudent = new Map<string, { o: number; m: number }>();
    for (const r of allMarks ?? []) {
      const cur = perStudent.get(r.student_id) ?? { o: 0, m: 0 };
      cur.o += Number(r.marks_obtained);
      cur.m += maxMap.get(r.offline_test_id) ?? 0;
      perStudent.set(r.student_id, cur);
    }
    const rows = (cohort ?? [])
      .map((c) => {
        const v = perStudent.get(c.id) ?? { o: 0, m: 0 };
        const pct = v.m > 0 ? Math.round((v.o / v.m) * 10000) / 100 : 0;
        return { user_id: c.id, name: c.name ?? "—", obtained: v.o, max: v.m, percentage: pct, isMe: c.id === userId };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    const myRank = rows.find((r) => r.isMe)?.rank ?? null;
    return { rows: rows.slice(0, 50), myRank };
  });
