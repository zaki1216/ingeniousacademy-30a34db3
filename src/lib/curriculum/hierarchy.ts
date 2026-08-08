/**
 * Curriculum hierarchy data layer (client side).
 *
 *   Board → Standard → Subject → Course/Module → Chapter → Lecture
 *
 * The database keeps the existing tables: `subjects` rows are COURSES
 * (Algebra, Grammar, Science 01…), `academic_subjects` rows are SUBJECTS
 * (Mathematics, English…) scoped to a standard, and `subject_standards`
 * maps one course to any number of (standard, subject) pairs. A shared
 * course therefore exists exactly once with several mappings.
 */
import { supabase } from "@/integrations/supabase/client";

export type Board = { id: string; name: string; display_order: number; is_active: boolean };
export type Standard = { id: string; name: string; display_order: number; board_id: string | null };
export type AcademicSubject = {
  id: string;
  standard_id: string;
  name: string;
  display_name: string | null;
  icon: string | null;
  building_id: string | null;
  sort_order: number;
  is_active: boolean;
};
export type Course = {
  id: string;
  subject_name: string;
  description: string | null;
  is_shared: boolean;
  status: string;
  sort_order: number;
  version: number;
};
export type CourseMapping = {
  id: string;
  subject_id: string;
  standard_id: string;
  academic_subject_id: string | null;
};
export type Chapter = {
  id: string;
  subject_id: string;
  chapter_name: string;
  chapter_number: number;
  description: string | null;
  is_active: boolean;
  completion_xp: number;
  completion_coins: number;
};
export type Lecture = {
  id: string;
  chapter_id: string;
  lecture_title: string;
  lecture_number: number;
  youtube_url: string;
  description: string | null;
  status: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
};

export const LECTURE_STATUSES = ["published", "draft", "archived"] as const;

/* ------------------------------- reads ------------------------------- */

export async function fetchBoards(): Promise<Board[]> {
  const { data } = await supabase.from("boards").select("*").order("display_order");
  return (data ?? []) as Board[];
}

export async function fetchStandards(boardId?: string): Promise<Standard[]> {
  let q = supabase.from("standards").select("id, name, display_order, board_id");
  if (boardId) q = q.eq("board_id", boardId);
  const { data } = await q.order("display_order");
  return (data ?? []) as Standard[];
}

export async function fetchAcademicSubjects(standardId: string): Promise<AcademicSubject[]> {
  const { data } = await supabase
    .from("academic_subjects")
    .select("*")
    .eq("standard_id", standardId)
    .order("sort_order")
    .order("name");
  return (data ?? []) as AcademicSubject[];
}

export async function fetchCourseMappings(filter: {
  standardId?: string;
  academicSubjectId?: string;
  courseIds?: string[];
}): Promise<CourseMapping[]> {
  let q = supabase.from("subject_standards").select("id, subject_id, standard_id, academic_subject_id");
  if (filter.standardId) q = q.eq("standard_id", filter.standardId);
  if (filter.academicSubjectId) q = q.eq("academic_subject_id", filter.academicSubjectId);
  if (filter.courseIds?.length) q = q.in("subject_id", filter.courseIds);
  const { data } = await q;
  return (data ?? []) as CourseMapping[];
}

async function fetchCoursesByIds(ids: string[]): Promise<Course[]> {
  if (!ids.length) return [];
  const { data } = await supabase
    .from("subjects")
    .select("id, subject_name, description, is_shared, status, sort_order, version")
    .in("id", ids)
    .order("sort_order")
    .order("subject_name");
  return (data ?? []) as Course[];
}

/** Courses (modules) that belong to a subject inside a standard. */
export async function fetchCoursesForSubject(academicSubjectId: string): Promise<Course[]> {
  const maps = await fetchCourseMappings({ academicSubjectId });
  return fetchCoursesByIds(Array.from(new Set(maps.map((m) => m.subject_id))));
}

export async function fetchAllCourses(): Promise<Course[]> {
  const { data } = await supabase
    .from("subjects")
    .select("id, subject_name, description, is_shared, status, sort_order, version")
    .order("sort_order")
    .order("subject_name");
  return (data ?? []) as Course[];
}

export async function fetchChapters(courseId: string, opts?: { includeInactive?: boolean }): Promise<Chapter[]> {
  let q = supabase.from("chapters").select("*").eq("subject_id", courseId);
  if (!opts?.includeInactive) q = q.eq("is_active", true);
  const { data } = await q.order("chapter_number");
  return (data ?? []) as Chapter[];
}

export async function fetchLectures(
  chapterIds: string[],
  opts?: { includeUnpublished?: boolean },
): Promise<Lecture[]> {
  if (!chapterIds.length) return [];
  let q = supabase.from("lectures").select("*").in("chapter_id", chapterIds);
  if (!opts?.includeUnpublished) q = q.eq("status", "published");
  const { data } = await q.order("lecture_number");
  return (data ?? []) as Lecture[];
}

/* ------------------------------- writes ------------------------------ */

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<T>;
}

export async function saveAcademicSubject(input: Partial<AcademicSubject> & { standard_id: string; name: string }) {
  const payload = {
    standard_id: input.standard_id,
    name: input.name,
    display_name: input.display_name ?? null,
    icon: input.icon ?? null,
    building_id: input.building_id ?? null,
    sort_order: input.sort_order ?? 0,
    is_active: input.is_active ?? true,
  };
  if (input.id) {
    unwrap(await supabase.from("academic_subjects").update(payload).eq("id", input.id).select("id").single());
    return input.id;
  }
  const row = unwrap(await supabase.from("academic_subjects").insert(payload).select("id").single());
  return row.id;
}

export async function deleteAcademicSubject(id: string) {
  const { error } = await supabase.from("academic_subjects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type CourseMappingInput = { standard_id: string; academic_subject_id: string };

/** Create/update a course and replace its (standard, subject) mappings. */
export async function saveCourse(input: {
  id?: string;
  subject_name: string;
  description?: string | null;
  is_shared: boolean;
  status: string;
  sort_order?: number;
  mappings: CourseMappingInput[];
}) {
  const payload = {
    subject_name: input.subject_name,
    description: input.description ?? null,
    is_shared: input.is_shared,
    status: input.status,
    sort_order: input.sort_order ?? 0,
    standard_id: input.mappings[0]?.standard_id ?? null,
  };
  let courseId = input.id;
  if (courseId) {
    unwrap(await supabase.from("subjects").update(payload).eq("id", courseId).select("id").single());
  } else {
    const row = unwrap(await supabase.from("subjects").insert(payload).select("id").single());
    courseId = row.id;
  }
  await syncCourseMappings(courseId!, input.mappings);
  return courseId!;
}

/** Replace the mapping set of a course without duplicating the course. */
export async function syncCourseMappings(courseId: string, mappings: CourseMappingInput[]) {
  const existing = await fetchCourseMappings({ courseIds: [courseId] });
  const key = (m: { standard_id: string; academic_subject_id: string | null }) =>
    `${m.standard_id}::${m.academic_subject_id ?? ""}`;
  const wanted = new Map(mappings.map((m) => [key(m), m]));
  const present = new Set(existing.map(key));

  const toAdd = Array.from(wanted.entries())
    .filter(([k]) => !present.has(k))
    .map(([, m]) => ({ subject_id: courseId, standard_id: m.standard_id, academic_subject_id: m.academic_subject_id }));
  const toRemove = existing.filter((m) => !wanted.has(key(m))).map((m) => m.id);

  if (toAdd.length) {
    const { error } = await supabase.from("subject_standards").insert(toAdd);
    if (error) throw new Error(error.message);
  }
  if (toRemove.length) {
    const { error } = await supabase.from("subject_standards").delete().in("id", toRemove);
    if (error) throw new Error(error.message);
  }
}

export async function deleteCourse(id: string) {
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveChapter(input: {
  id?: string;
  subject_id: string;
  chapter_name: string;
  chapter_number: number;
  description?: string | null;
  is_active?: boolean;
  completion_xp?: number;
  completion_coins?: number;
}) {
  const payload = {
    subject_id: input.subject_id,
    chapter_name: input.chapter_name,
    chapter_number: input.chapter_number,
    description: input.description ?? null,
    is_active: input.is_active ?? true,
    ...(input.completion_xp !== undefined ? { completion_xp: input.completion_xp } : {}),
    ...(input.completion_coins !== undefined ? { completion_coins: input.completion_coins } : {}),
  };
  if (input.id) {
    const { error } = await supabase.from("chapters").update(payload).eq("id", input.id);
    if (error) throw new Error(error.message);
    return input.id;
  }
  const row = unwrap(await supabase.from("chapters").insert(payload).select("id").single());
  return row.id;
}

export async function deleteChapter(id: string) {
  const { error } = await supabase.from("chapters").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveLecture(input: {
  id?: string;
  chapter_id: string;
  lecture_title: string;
  lecture_number: number;
  youtube_url: string;
  description?: string | null;
  status?: string;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
}) {
  const payload = {
    chapter_id: input.chapter_id,
    lecture_title: input.lecture_title,
    lecture_number: input.lecture_number,
    youtube_url: input.youtube_url,
    description: input.description ?? null,
    status: input.status ?? "published",
    thumbnail_url: input.thumbnail_url ?? null,
    duration_seconds: input.duration_seconds ?? null,
  };
  if (input.id) {
    const { error } = await supabase.from("lectures").update(payload).eq("id", input.id);
    if (error) throw new Error(error.message);
    return input.id;
  }
  const row = unwrap(await supabase.from("lectures").insert(payload).select("id").single());
  return row.id;
}

export async function deleteLecture(id: string) {
  const { error } = await supabase.from("lectures").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Swap the order value of two rows (Move up / Move down). */
export async function swapOrder(
  table: "academic_subjects" | "subjects" | "chapters" | "lectures",
  column: "sort_order" | "chapter_number" | "lecture_number",
  a: { id: string; value: number },
  b: { id: string; value: number },
) {
  const first = await supabase.from(table).update({ [column]: b.value } as never).eq("id", a.id);
  if (first.error) throw new Error(first.error.message);
  const second = await supabase.from(table).update({ [column]: a.value } as never).eq("id", b.id);
  if (second.error) throw new Error(second.error.message);
}
