/**
 * Shared Curriculum Engine — server-only implementation.
 *
 * A "course" is a row in `subjects`. It can be linked to any number of
 * standards through `subject_standards`. Content (chapters/lectures) is
 * never duplicated; only the links differ. Student progress stays per
 * student (video_completions / xp / coins), so it is unaffected.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CourseSummary = {
  id: string;
  subject_name: string;
  description: string | null;
  is_shared: boolean;
  status: string;
  version: number;
  previous_version_id: string | null;
  standard_ids: string[];
  standard_names: string[];
  student_count: number;
  chapter_count: number;
  lecture_count: number;
  completion_rate: number;
  updated_at: string | null;
  updated_by_name: string | null;
};

export async function listCourses(): Promise<{
  courses: CourseSummary[];
  standards: { id: string; name: string; display_order: number }[];
}> {
  const [subjectsRes, linksRes, standardsRes, chaptersRes, profilesRes] = await Promise.all([
    supabaseAdmin
      .from("subjects")
      .select("id, subject_name, description, is_shared, status, version, previous_version_id, updated_at, updated_by")
      .order("subject_name"),
    supabaseAdmin.from("subject_standards").select("subject_id, standard_id"),
    supabaseAdmin.from("standards").select("id, name, display_order").order("display_order"),
    supabaseAdmin.from("chapters").select("id, subject_id"),
    supabaseAdmin.from("profiles").select("id, name, standard_id, is_active"),
  ]);

  const subjects = subjectsRes.data ?? [];
  const links = linksRes.data ?? [];
  const standards = standardsRes.data ?? [];
  const chapters = chaptersRes.data ?? [];
  const profiles = profilesRes.data ?? [];

  const chapterIds = chapters.map((c) => c.id);
  const { data: lectures } = chapterIds.length
    ? await supabaseAdmin.from("lectures").select("id, chapter_id").in("chapter_id", chapterIds)
    : { data: [] as { id: string; chapter_id: string }[] };
  const lectureList = lectures ?? [];

  const { data: completions } = await supabaseAdmin
    .from("video_completions")
    .select("lecture_id, user_id");

  const editorIds = Array.from(
    new Set(subjects.map((s) => s.updated_by).filter(Boolean) as string[]),
  );
  const editorNames = new Map<string, string>();
  if (editorIds.length) {
    const { data: editors } = await supabaseAdmin.from("profiles").select("id, name").in("id", editorIds);
    for (const e of editors ?? []) editorNames.set(e.id, e.name ?? "");
  }

  const standardName = new Map(standards.map((s) => [s.id, s.name]));
  const studentsByStandard = new Map<string, number>();
  for (const p of profiles) {
    if (!p.standard_id || p.is_active === false) continue;
    studentsByStandard.set(p.standard_id, (studentsByStandard.get(p.standard_id) ?? 0) + 1);
  }

  const chaptersBySubject = new Map<string, string[]>();
  for (const c of chapters) {
    const arr = chaptersBySubject.get(c.subject_id) ?? [];
    arr.push(c.id);
    chaptersBySubject.set(c.subject_id, arr);
  }
  const lecturesByChapter = new Map<string, string[]>();
  for (const l of lectureList) {
    const arr = lecturesByChapter.get(l.chapter_id) ?? [];
    arr.push(l.id);
    lecturesByChapter.set(l.chapter_id, arr);
  }
  const completionsByLecture = new Map<string, number>();
  for (const c of completions ?? []) {
    completionsByLecture.set(c.lecture_id, (completionsByLecture.get(c.lecture_id) ?? 0) + 1);
  }

  const courses: CourseSummary[] = subjects.map((s) => {
    const standardIds = links.filter((l) => l.subject_id === s.id).map((l) => l.standard_id);
    const subjectChapters = chaptersBySubject.get(s.id) ?? [];
    const subjectLectures = subjectChapters.flatMap((cid) => lecturesByChapter.get(cid) ?? []);
    const studentCount = standardIds.reduce((n, id) => n + (studentsByStandard.get(id) ?? 0), 0);
    const possible = subjectLectures.length * studentCount;
    const achieved = subjectLectures.reduce((n, lid) => n + (completionsByLecture.get(lid) ?? 0), 0);
    return {
      id: s.id,
      subject_name: s.subject_name,
      description: s.description ?? null,
      is_shared: Boolean(s.is_shared),
      status: s.status ?? "active",
      version: s.version ?? 1,
      previous_version_id: s.previous_version_id ?? null,
      standard_ids: standardIds,
      standard_names: standardIds.map((id) => standardName.get(id) ?? "—"),
      student_count: studentCount,
      chapter_count: subjectChapters.length,
      lecture_count: subjectLectures.length,
      completion_rate: possible > 0 ? Math.round((achieved / possible) * 100) : 0,
      updated_at: s.updated_at ?? null,
      updated_by_name: s.updated_by ? editorNames.get(s.updated_by) ?? null : null,
    };
  });

  return { courses, standards };
}

export type SaveCourseInput = {
  id?: string;
  subject_name: string;
  description?: string | null;
  is_shared: boolean;
  status: "active" | "draft";
  standard_ids: string[];
};

export async function saveCourse(input: SaveCourseInput, editorId: string) {
  const primary = input.standard_ids[0] ?? null;
  let courseId = input.id;

  if (courseId) {
    const { error } = await supabaseAdmin
      .from("subjects")
      .update({
        subject_name: input.subject_name,
        description: input.description ?? null,
        is_shared: input.is_shared,
        status: input.status,
        standard_id: primary,
        updated_by: editorId,
      })
      .eq("id", courseId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabaseAdmin
      .from("subjects")
      .insert({
        subject_name: input.subject_name,
        description: input.description ?? null,
        is_shared: input.is_shared,
        status: input.status,
        standard_id: primary,
        updated_by: editorId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    courseId = data.id;
  }

  await syncCourseStandards(courseId!, input.standard_ids);
  return { id: courseId! };
}

export async function syncCourseStandards(courseId: string, standardIds: string[]) {
  const { data: existing } = await supabaseAdmin
    .from("subject_standards")
    .select("standard_id")
    .eq("subject_id", courseId);
  const current = new Set((existing ?? []).map((r) => r.standard_id));
  const next = new Set(standardIds);

  const toAdd = standardIds.filter((id) => !current.has(id));
  const toRemove = Array.from(current).filter((id) => !next.has(id));

  if (toAdd.length) {
    const { error } = await supabaseAdmin
      .from("subject_standards")
      .insert(toAdd.map((standard_id) => ({ subject_id: courseId, standard_id })));
    if (error) throw new Error(error.message);
  }
  if (toRemove.length) {
    const { error } = await supabaseAdmin
      .from("subject_standards")
      .delete()
      .eq("subject_id", courseId)
      .in("standard_id", toRemove);
    if (error) throw new Error(error.message);
  }
}

/**
 * Major update: clone the course shell as a new version (draft) that keeps a
 * pointer to the previous version. Existing content and student progress on
 * the old version stay untouched.
 */
export async function createCourseVersion(courseId: string, editorId: string) {
  const { data: source, error } = await supabaseAdmin
    .from("subjects")
    .select("subject_name, description, is_shared, version")
    .eq("id", courseId)
    .maybeSingle();
  if (error || !source) throw new Error("Course not found");

  const { data: links } = await supabaseAdmin
    .from("subject_standards")
    .select("standard_id")
    .eq("subject_id", courseId);

  const { data: created, error: insertErr } = await supabaseAdmin
    .from("subjects")
    .insert({
      subject_name: source.subject_name,
      description: source.description,
      is_shared: source.is_shared,
      status: "draft",
      version: (source.version ?? 1) + 1,
      previous_version_id: courseId,
      standard_id: links?.[0]?.standard_id ?? null,
      updated_by: editorId,
    })
    .select("id")
    .single();
  if (insertErr) throw new Error(insertErr.message);

  await syncCourseStandards(created.id, (links ?? []).map((l) => l.standard_id));
  return { id: created.id, version: (source.version ?? 1) + 1 };
}
