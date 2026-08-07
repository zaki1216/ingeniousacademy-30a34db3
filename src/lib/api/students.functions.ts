import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validateUsername } from "@/lib/username";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles").select("user_id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error || !data) throw new Error("Forbidden: admin only");
}

const admin = () => import("@/integrations/supabase/client.server").then((m) => m.supabaseAdmin);

function fallbackEmail(username: string) {
  return `${username.toLowerCase()}@cadet.ingeniousacademy.app`;
}

async function usernameTaken(db: any, username: string, exceptId?: string) {
  const { data } = await db.from("profiles").select("id, username").ilike("username", username);
  return (data ?? []).some((r: { id: string }) => r.id !== exceptId);
}

// ---------------- Admin: list ----------------
export const adminListStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const db = await admin();

    const [{ data: roles }, { data: standards }] = await Promise.all([
      db.from("user_roles").select("user_id").eq("role", "student"),
      db.from("standards").select("id, name").order("display_order"),
    ]);
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) return { students: [], standards: standards ?? [] };

    const [{ data: profiles }, { data: stats }, { data: att }] = await Promise.all([
      db.from("profiles")
        .select("id, name, email, phone, parent_name, parent_phone, parent_whatsapp, roll_number, admission_date, standard_id, is_active, created_at, username, username_locked, username_changed_at")
        .in("id", ids).order("name"),
      db.from("gamification_stats")
        .select("user_id, xp, level, coins, streak_days, last_active_date, updated_at")
        .in("user_id", ids),
      db.from("attendance").select("student_id, status").in("student_id", ids),
    ]);

    const statMap = new Map((stats ?? []).map((s) => [s.user_id, s]));
    const attMap = new Map<string, { p: number; t: number }>();
    for (const a of att ?? []) {
      const cur = attMap.get(a.student_id) ?? { p: 0, t: 0 };
      cur.t += 1;
      if (a.status === "present") cur.p += 1;
      attMap.set(a.student_id, cur);
    }

    const students = (profiles ?? []).map((p) => {
      const s = statMap.get(p.id);
      const a = attMap.get(p.id) ?? { p: 0, t: 0 };
      return {
        id: p.id,
        name: p.name,
        username: p.username,
        username_locked: p.username_locked,
        username_changed_at: p.username_changed_at,
        email: p.email,
        phone: p.phone,
        parent_name: p.parent_name,
        parent_phone: p.parent_phone,
        parent_whatsapp: p.parent_whatsapp,
        roll_number: p.roll_number,
        admission_date: p.admission_date,
        standard_id: p.standard_id,
        is_active: p.is_active !== false,
        created_at: p.created_at,
        xp: s?.xp ?? 0,
        level: s?.level ?? 1,
        coins: s?.coins ?? 0,
        streak_days: s?.streak_days ?? 0,
        last_active: s?.last_active_date ?? null,
        attendance_present: a.p,
        attendance_total: a.t,
      };
    });
    return { students, standards: standards ?? [] };
  });

// ---------------- Admin: create ----------------
const CreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  username: z.string().trim().min(4).max(20),
  password: z.string().min(6).max(128),
  email: z.string().trim().email().max(255).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  parent_name: z.string().trim().max(120).nullable().optional(),
  parent_phone: z.string().trim().max(20).nullable().optional(),
  parent_whatsapp: z.string().trim().max(20).nullable().optional(),
  roll_number: z.string().trim().max(30).nullable().optional(),
  admission_date: z.string().trim().max(20).nullable().optional(),
  standard_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().default(true),
});

export const adminCreateStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CreateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const db = await admin();

    const check = validateUsername(data.username);
    if (!check.ok) throw new Error(check.reason ?? "Invalid username");
    if (await usernameTaken(db, data.username)) throw new Error("Username already taken");

    const email = data.email?.trim() || fallbackEmail(data.username);

    const { data: created, error } = await db.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name, username: data.username },
    });
    if (error || !created.user) throw new Error(error?.message || "Failed to create student");

    const id = created.user.id;
    const { error: pErr } = await db.from("profiles").upsert({
      id,
      name: data.name,
      username: data.username,
      email,
      phone: data.phone || null,
      parent_name: data.parent_name || null,
      parent_phone: data.parent_phone || null,
      parent_whatsapp: data.parent_whatsapp || null,
      roll_number: data.roll_number || null,
      admission_date: data.admission_date || null,
      standard_id: data.standard_id ?? null,
      is_active: data.is_active,
    });
    if (pErr) {
      await db.auth.admin.deleteUser(id);
      throw new Error(pErr.message);
    }
    await db.from("user_roles").upsert({ user_id: id, role: "student" }, { onConflict: "user_id,role" });
    return { ok: true, id };
  });

// ---------------- Admin: update ----------------
const UpdateSchema = CreateSchema.partial().omit({ password: true }).extend({
  userId: z.string().uuid(),
});

export const adminUpdateStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const db = await admin();
    const { userId, username, email, ...rest } = data;

    const patch: Record<string, any> = {};
    for (const [k, v] of Object.entries(rest)) if (v !== undefined) patch[k] = v === "" ? null : v;

    if (username !== undefined && username !== null && username !== "") {
      const check = validateUsername(username);
      if (!check.ok) throw new Error(check.reason ?? "Invalid username");
      if (await usernameTaken(db, username, userId)) throw new Error("Username already taken");
      patch.username = username;
      patch.username_changed_at = new Date().toISOString();
    }
    if (email !== undefined && email) {
      patch.email = email;
      const { error: aErr } = await db.auth.admin.updateUserById(userId, { email });
      if (aErr) throw new Error(aErr.message);
    }

    const { error } = await db.from("profiles").update(patch as never).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Admin: status / delete / bulk ----------------
export const adminSetStudentsActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    userIds: z.array(z.string().uuid()).min(1), isActive: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const db = await admin();
    const { error } = await db.from("profiles").update({ is_active: data.isActive }).in("id", data.userIds);
    if (error) throw new Error(error.message);
    // Block/allow sign-in without touching any academic data.
    for (const id of data.userIds) {
      await db.auth.admin.updateUserById(id, { ban_duration: data.isActive ? "none" : "876000h" });
    }
    return { ok: true, count: data.userIds.length };
  });

export const adminDeleteStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userIds: z.array(z.string().uuid()).min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const db = await admin();
    for (const id of data.userIds) {
      const { error } = await db.auth.admin.deleteUser(id);
      if (error) throw new Error(error.message);
    }
    return { ok: true, count: data.userIds.length };
  });

export const adminSetStudentsStandard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    userIds: z.array(z.string().uuid()).min(1), standardId: z.string().uuid().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const db = await admin();
    const { error } = await db.from("profiles").update({ standard_id: data.standardId }).in("id", data.userIds);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.userIds.length };
  });

export const adminResetStudentPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    userId: z.string().uuid(), password: z.string().min(6).max(128),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const db = await admin();
    const { error } = await db.auth.admin.updateUserById(data.userId, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Admin: username controls ----------------
export const adminSetUsernameLock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), locked: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const db = await admin();
    const { error } = await db.from("profiles").update({ username_locked: data.locked }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Clears the username and the 30-day cooldown so the student can pick a new one. */
export const adminResetUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const db = await admin();
    const { error } = await db.from("profiles")
      .update({ username: null, username_changed_at: null }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Admin: detail ----------------
export const adminGetStudentAdminInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const db = await admin();
    const uid = data.userId;

    const [{ data: profile }, { data: stats }, { data: authUser }, { data: recentXp }, { data: recentVideos }] =
      await Promise.all([
        db.from("profiles").select("*").eq("id", uid).maybeSingle(),
        db.from("gamification_stats").select("*").eq("user_id", uid).maybeSingle(),
        db.auth.admin.getUserById(uid),
        db.from("xp_transactions").select("amount, reason, created_at")
          .eq("user_id", uid).order("created_at", { ascending: false }).limit(10),
        db.from("video_completions").select("lecture_id, completed_at, lectures(lecture_title)")
          .eq("user_id", uid).order("completed_at", { ascending: false }).limit(10),
      ]);

    let standardName: string | null = null;
    let subjects: { id: string; subject_name: string }[] = [];
    if (profile?.standard_id) {
      const [{ data: std }, { data: subs }] = await Promise.all([
        db.from("standards").select("name").eq("id", profile.standard_id).maybeSingle(),
        (async () => {
          const { subjectsForStandard } = await import("@/lib/curriculum/shared.server");
          const rows = await subjectsForStandard(db as any, profile.standard_id!);
          return { data: rows.sort((a, b) => a.subject_name.localeCompare(b.subject_name)) };
        })(),
      ]);
      standardName = std?.name ?? null;
      subjects = subs ?? [];
    }

    return {
      profile,
      stats,
      standardName,
      subjects,
      lastSignInAt: authUser?.user?.last_sign_in_at ?? null,
      createdAt: authUser?.user?.created_at ?? null,
      banned: Boolean((authUser?.user as { banned_until?: string } | undefined)?.banned_until),
      recentXp: recentXp ?? [],
      recentVideos: (recentVideos ?? []).map((v: any) => ({
        title: v.lectures?.lecture_title ?? "Lecture",
        at: v.completed_at,
      })),
    };
  });

// ---------------- Student: username self-service ----------------
export const checkUsernameAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ username: z.string().max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    const check = validateUsername(data.username);
    if (!check.ok) return { status: "invalid" as const, reason: check.reason };
    const db = await admin();
    const taken = await usernameTaken(db, data.username, context.userId);
    return { status: taken ? ("taken" as const) : ("available" as const) };
  });

export const getMyUsernameInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("name, username, username_changed_at, username_locked")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateMyUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ username: z.string().trim().min(4).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const check = validateUsername(data.username);
    if (!check.ok) throw new Error(check.reason ?? "Invalid username");
    const db = await admin();
    if (await usernameTaken(db, data.username, context.userId)) throw new Error("Username already taken");

    // Uses the user-scoped client so database rules (lock + 30 day cooldown) apply.
    const { error } = await context.supabase
      .from("profiles")
      .update({ username: data.username })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, username: data.username };
  });
