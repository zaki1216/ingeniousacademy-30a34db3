/**
 * Shared Curriculum resolution (client side).
 *
 * A course (subject) can now belong to many standards through the
 * `subject_standards` link table. `subjects.standard_id` is kept for
 * backward compatibility (it is the "owner" standard of a standard-specific
 * course) and is mirrored into the link table by a database trigger, so
 * resolving through the link table alone is always correct.
 */
import { supabase } from "@/integrations/supabase/client";

export type CourseRow = {
  id: string;
  subject_name: string;
  description?: string | null;
  is_shared?: boolean | null;
  status?: string | null;
  version?: number | null;
  standard_id?: string | null;
  updated_at?: string | null;
};

/** All course ids linked to a standard (shared + standard-specific). */
export async function fetchSubjectIdsForStandard(standardId: string): Promise<string[]> {
  const { data } = await supabase
    .from("subject_standards")
    .select("subject_id")
    .eq("standard_id", standardId);
  return Array.from(new Set((data ?? []).map((r) => r.subject_id)));
}

/**
 * All active courses visible to a standard. Draft courses are hidden from
 * students but returned when `includeDrafts` is true (admin surfaces).
 */
export async function fetchSubjectsForStandard(
  standardId: string,
  opts?: { includeDrafts?: boolean },
): Promise<CourseRow[]> {
  const ids = await fetchSubjectIdsForStandard(standardId);
  if (ids.length === 0) return [];
  let q = supabase
    .from("subjects")
    .select("id, subject_name, description, is_shared, status, version, standard_id, updated_at")
    .in("id", ids);
  if (!opts?.includeDrafts) q = q.eq("status", "active");
  const { data } = await q.order("subject_name");
  return (data ?? []) as CourseRow[];
}
