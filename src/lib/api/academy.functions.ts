import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Public: setup status ----------
export const checkSetupNeeded = createServerFn({ method: "GET" }).handler(async () => {
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  return { setupNeeded: (count ?? 0) === 0 };
});

// ---------- Public: create the first super admin ----------
const SuperAdminSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120),
});

export const createSuperAdmin = createServerFn({ method: "POST" })
  .inputValidator((data) => SuperAdminSchema.parse(data))
  .handler(async ({ data }) => {
    // Only allowed when zero admins exist
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) {
      throw new Error("Super admin already exists. Setup is complete.");
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (error || !created.user) throw new Error(error?.message || "Failed to create admin");

    const userId = created.user.id;
    await supabaseAdmin.from("profiles").insert({
      id: userId,
      name: data.name,
      email: data.email,
      is_active: true,
    });
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });

    return { ok: true };
  });

// ---------- Admin guard helper ----------
async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

// ---------- Admin: create student ----------
const CreateStudentSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  name: z.string().min(1).max(120),
  phone: z.string().max(20).optional().nullable(),
  parent_phone: z.string().max(20).optional().nullable(),
  standard_id: z.string().uuid().nullable().optional(),
});

export const createStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CreateStudentSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (error || !created.user) throw new Error(error?.message || "Failed to create student");

    const userId = created.user.id;
    const { error: pErr } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      parent_phone: data.parent_phone ?? null,
      standard_id: data.standard_id ?? null,
      is_active: true,
    });
    if (pErr) throw new Error(pErr.message);

    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "student" });
    return { ok: true, id: userId };
  });

// ---------- Admin: update student ----------
const UpdateStudentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  phone: z.string().max(20).optional().nullable(),
  parent_phone: z.string().max(20).optional().nullable(),
  standard_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean(),
});

export const updateStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => UpdateStudentSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        name: data.name,
        phone: data.phone ?? null,
        parent_phone: data.parent_phone ?? null,
        standard_id: data.standard_id ?? null,
        is_active: data.is_active,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admin: delete student ----------
export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admin: reset password ----------
export const resetStudentPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), password: z.string().min(6).max(128) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Student: get test (without correct answers) ----------
export const getTestForStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ testId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { data: test, error: tErr } = await supabaseAdmin
      .from("tests")
      .select("id, title, chapter_id, total_marks")
      .eq("id", data.testId)
      .single();
    if (tErr || !test) throw new Error(tErr?.message || "Test not found");

    const { data: questions, error: qErr } = await supabaseAdmin
      .from("questions")
      .select("id, question_text, options, marks, question_order")
      .eq("test_id", data.testId)
      .order("question_order", { ascending: true });
    if (qErr) throw new Error(qErr.message);
    return { test, questions: questions ?? [] };
  });

// ---------- Student: submit test (server-side grading) ----------
const SubmitSchema = z.object({
  testId: z.string().uuid(),
  answers: z.record(z.string().uuid(), z.number().int().min(0).max(20)),
});

export const submitTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => SubmitSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: questions, error: qErr } = await supabaseAdmin
      .from("questions")
      .select("id, correct_option, marks")
      .eq("test_id", data.testId);
    if (qErr) throw new Error(qErr.message);
    if (!questions || questions.length === 0) throw new Error("No questions in test");

    let score = 0;
    let total = 0;
    for (const q of questions) {
      total += q.marks;
      if (data.answers[q.id] === q.correct_option) score += q.marks;
    }
    const percentage = total > 0 ? Math.round((score / total) * 10000) / 100 : 0;

    const { data: inserted, error: rErr } = await supabaseAdmin
      .from("results")
      .insert({
        student_id: context.userId,
        test_id: data.testId,
        score,
        total_marks: total,
        percentage,
        answers: data.answers,
      })
      .select("id")
      .single();
    if (rErr) throw new Error(rErr.message);

    return { ok: true, resultId: inserted.id, score, total, percentage };
  });
