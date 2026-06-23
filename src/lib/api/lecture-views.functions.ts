import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("user_id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

// List all lectures with aggregate view stats (viewers, total watches)
export const adminListLectureViewStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    const [{ data: lectures }, { data: subjects }, { data: chapters }, { data: views }] = await Promise.all([
      supabaseAdmin.from("lectures").select("id, lecture_title, lecture_number, chapter_id").order("lecture_number"),
      supabaseAdmin.from("subjects").select("id, subject_name"),
      supabaseAdmin.from("chapters").select("id, chapter_name, chapter_number, subject_id"),
      supabaseAdmin.from("video_completions").select("lecture_id, watch_count"),
    ]);

    const agg = new Map<string, { viewers: number; totalWatches: number }>();
    for (const v of views ?? []) {
      const cur = agg.get(v.lecture_id) ?? { viewers: 0, totalWatches: 0 };
      cur.viewers += 1;
      cur.totalWatches += v.watch_count ?? 1;
      agg.set(v.lecture_id, cur);
    }

    const rows = (lectures ?? []).map((l) => {
      const ch = (chapters ?? []).find((c) => c.id === l.chapter_id);
      const sub = (subjects ?? []).find((s) => s.id === ch?.subject_id);
      const a = agg.get(l.id) ?? { viewers: 0, totalWatches: 0 };
      return {
        id: l.id,
        lecture_number: l.lecture_number,
        lecture_title: l.lecture_title,
        chapter_name: ch?.chapter_name ?? null,
        chapter_number: ch?.chapter_number ?? null,
        subject_name: sub?.subject_name ?? null,
        viewers: a.viewers,
        totalWatches: a.totalWatches,
      };
    });
    return { rows };
  });

// Per-lecture: list students who watched, with watch count and last watched.
export const adminGetLectureWatchers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ lectureId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { data: views } = await supabaseAdmin
      .from("video_completions")
      .select("user_id, watch_count, last_watched_at, completed_at")
      .eq("lecture_id", data.lectureId)
      .order("last_watched_at", { ascending: false });

    const ids = (views ?? []).map((v) => v.user_id);
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, name, email, standard_id").in("id", ids)
      : { data: [] as { id: string; name: string | null; email: string | null; standard_id: string | null }[] };

    const rows = (views ?? []).map((v) => {
      const p = profiles?.find((p) => p.id === v.user_id);
      return {
        user_id: v.user_id,
        name: p?.name ?? "—",
        email: p?.email ?? "",
        standard_id: p?.standard_id ?? null,
        watch_count: v.watch_count ?? 1,
        last_watched_at: v.last_watched_at ?? v.completed_at,
        first_completed_at: v.completed_at,
      };
    });
    return { rows };
  });

// Per-student: list of lectures they've watched.
export const adminGetStudentWatchHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ studentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { data: views } = await supabaseAdmin
      .from("video_completions")
      .select("lecture_id, watch_count, last_watched_at, completed_at")
      .eq("user_id", data.studentId)
      .order("last_watched_at", { ascending: false });

    const lectureIds = (views ?? []).map((v) => v.lecture_id);
    if (lectureIds.length === 0) return { rows: [] };

    const { data: lectures } = await supabaseAdmin
      .from("lectures")
      .select("id, lecture_title, lecture_number, chapter_id")
      .in("id", lectureIds);

    const chapterIds = Array.from(new Set((lectures ?? []).map((l) => l.chapter_id).filter(Boolean) as string[]));
    const { data: chapters } = chapterIds.length
      ? await supabaseAdmin.from("chapters").select("id, chapter_name, chapter_number, subject_id").in("id", chapterIds)
      : { data: [] as { id: string; chapter_name: string; chapter_number: number; subject_id: string }[] };

    const subjectIds = Array.from(new Set((chapters ?? []).map((c) => c.subject_id).filter(Boolean) as string[]));
    const { data: subjects } = subjectIds.length
      ? await supabaseAdmin.from("subjects").select("id, subject_name").in("id", subjectIds)
      : { data: [] as { id: string; subject_name: string }[] };

    const rows = (views ?? []).map((v) => {
      const l = lectures?.find((x) => x.id === v.lecture_id);
      const ch = chapters?.find((c) => c.id === l?.chapter_id);
      const sub = subjects?.find((s) => s.id === ch?.subject_id);
      return {
        lecture_id: v.lecture_id,
        lecture_title: l?.lecture_title ?? "—",
        lecture_number: l?.lecture_number ?? 0,
        chapter_name: ch?.chapter_name ?? null,
        subject_name: sub?.subject_name ?? null,
        watch_count: v.watch_count ?? 1,
        last_watched_at: v.last_watched_at ?? v.completed_at,
      };
    });
    return { rows };
  });

export const adminListStudentsForViews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: students } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "student");
    const ids = (students ?? []).map((s) => s.user_id);
    if (ids.length === 0) return { students: [] };
    const { data: profiles } = await supabaseAdmin
      .from("profiles").select("id, name, email").in("id", ids).order("name");
    return { students: profiles ?? [] };
  });
