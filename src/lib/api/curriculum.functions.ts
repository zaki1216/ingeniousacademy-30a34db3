import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

/** Admin: every course with its linked standards and analytics. */
export const adminListCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { listCourses } = await import("@/lib/curriculum/engine.server");
    return listCourses();
  });

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  subject_name: z.string().min(1),
  description: z.string().nullable().optional(),
  is_shared: z.boolean(),
  status: z.enum(["active", "draft"]),
  standard_ids: z.array(z.string().uuid()).min(1),
});

/** Admin: create or update a course and its standard assignments. */
export const adminSaveCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { saveCourse } = await import("@/lib/curriculum/engine.server");
    return saveCourse(data, context.userId);
  });

/** Admin: major update — clone the course as a new draft version. */
export const adminCreateCourseVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ courseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { createCourseVersion } = await import("@/lib/curriculum/engine.server");
    return createCourseVersion(data.courseId, context.userId);
  });
