/**
 * Shared Curriculum resolution (server side, service-role client).
 *
 * Mirrors `src/lib/curriculum/shared.ts` for server functions so that a
 * course assigned to several standards resolves for every linked student
 * without duplicating rows.
 */
type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export async function subjectIdsForStandard(
  admin: Admin,
  standardId: string,
): Promise<string[]> {
  const { data } = await admin
    .from("subject_standards")
    .select("subject_id")
    .eq("standard_id", standardId);
  return Array.from(new Set((data ?? []).map((r) => r.subject_id)));
}

export async function subjectsForStandard(
  admin: Admin,
  standardId: string,
  opts?: { includeDrafts?: boolean },
): Promise<{ id: string; subject_name: string }[]> {
  const ids = await subjectIdsForStandard(admin, standardId);
  if (ids.length === 0) return [];
  let q = admin.from("subjects").select("id, subject_name, status").in("id", ids);
  if (!opts?.includeDrafts) q = q.eq("status", "active");
  const { data } = await q;
  return (data ?? []).map((s) => ({ id: s.id, subject_name: s.subject_name }));
}

/** True when the lecture's course is linked to the student's standard. */
export async function lectureAllowedForStandard(
  admin: Admin,
  subjectId: string,
  standardId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("subject_standards")
    .select("subject_id")
    .eq("subject_id", subjectId)
    .eq("standard_id", standardId)
    .maybeSingle();
  return !!data;
}
