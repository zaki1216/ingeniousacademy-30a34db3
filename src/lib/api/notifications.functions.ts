import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const admin = () => import("@/integrations/supabase/client.server").then((m) => m.supabaseAdmin);
const service = () => import("@/lib/notifications/service.server");

async function assertAdmin(supabase: {
  from: (t: string) => {
    select: (c: string) => {
      eq: (a: string, b: string) => { eq: (a: string, b: string) => { maybeSingle: () => Promise<{ data: unknown }> } };
    };
  };
}, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

/* ------------------------------ Public config ------------------------------ */

export const getPushConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { getVapidPublicKeyOrNull } = await import("@/lib/notifications/webpush.server");
  return { publicKey: getVapidPublicKeyOrNull() };
});

/* -------------------------------- Devices ---------------------------------- */

export const registerPushDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        endpoint: z.string().url(),
        p256dh: z.string().min(10),
        auth: z.string().min(4),
        userAgent: z.string().max(400).optional(),
        label: z.string().max(80).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    await db
      .from("push_subscriptions")
      .upsert(
        {
          user_id: context.userId,
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          user_agent: data.userAgent ?? null,
          device_label: data.label ?? null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      );
    return { ok: true };
  });

export const listPushDevices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("push_subscriptions")
      .select("id, device_label, user_agent, is_active, created_at, last_used_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return { devices: data ?? [] };
  });

export const removePushDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid().optional(), endpoint: z.string().url().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("push_subscriptions").delete().eq("user_id", context.userId);
    if (data.id) q = q.eq("id", data.id);
    else if (data.endpoint) q = q.eq("endpoint", data.endpoint);
    else return { ok: false };
    await q;
    return { ok: true };
  });

/* ------------------------------ Notifications ------------------------------ */

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("notifications")
      .select("id, type, title, body, url, created_at, read_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    const items = data ?? [];
    return { items, unread: items.filter((n) => !n.read_at).length };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ids: z.array(z.string().uuid()).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (data.ids?.length) q = q.in("id", data.ids);
    await q;
    return { ok: true };
  });

/* ------------------------------ Event triggers ----------------------------- */

export const notifyLecturePublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ lectureId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const db = await admin();
    const { notifyStudents } = await service();

    const lecture = await db
      .from("lectures")
      .select("id, lecture_title, status, chapter_id")
      .eq("id", data.lectureId)
      .maybeSingle();
    if (!lecture.data || lecture.data.status !== "published") return { skipped: true };

    const chapter = await db
      .from("chapters")
      .select("id, chapter_name, subject_id")
      .eq("id", lecture.data.chapter_id)
      .maybeSingle();
    const subject = chapter.data?.subject_id
      ? (await db.from("subjects").select("subject_name").eq("id", chapter.data.subject_id).maybeSingle()).data
      : null;

    return notifyStudents({
      target: { kind: "chapter", chapterId: lecture.data.chapter_id },
      type: "lecture",
      title: "🔔 New Lecture Available",
      body: `${subject?.subject_name ?? "Academy"} — ${chapter.data?.chapter_name ?? ""}\n${lecture.data.lecture_title} is now available. Tap to watch.`,
      url: "/app/journey",
      metadata: { lectureId: lecture.data.id, chapterId: lecture.data.chapter_id },
      eventKey: `lecture:${lecture.data.id}`,
    });
  });

export const notifyNotesPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ noteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const db = await admin();
    const { notifyStudents } = await service();

    const note = await db.from("notes").select("id, title, chapter_id").eq("id", data.noteId).maybeSingle();
    if (!note.data) return { skipped: true };
    const chapter = await db
      .from("chapters")
      .select("chapter_name, subject_id")
      .eq("id", note.data.chapter_id)
      .maybeSingle();
    const subject = chapter.data?.subject_id
      ? (await db.from("subjects").select("subject_name").eq("id", chapter.data.subject_id).maybeSingle()).data
      : null;

    return notifyStudents({
      target: { kind: "chapter", chapterId: note.data.chapter_id },
      type: "notes",
      title: "📄 New Study Material",
      body: `${subject?.subject_name ?? "Academy"} — ${chapter.data?.chapter_name ?? ""}\n${note.data.title} has been added. Tap to open.`,
      url: "/app/notes",
      metadata: { noteId: note.data.id },
      eventKey: `note:${note.data.id}`,
    });
  });

/* --------------------------- Admin: send manually --------------------------- */

export const adminSendNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        title: z.string().min(2).max(120),
        message: z.string().min(2).max(500),
        url: z.string().max(200).optional().nullable(),
        alsoAnnouncement: z.boolean().optional(),
        target: z.discriminatedUnion("kind", [
          z.object({ kind: z.literal("all") }),
          z.object({ kind: z.literal("standards"), standardIds: z.array(z.string().uuid()).min(1) }),
          z.object({ kind: z.literal("subject"), subjectId: z.string().uuid() }),
          z.object({ kind: z.literal("chapter"), chapterId: z.string().uuid() }),
          z.object({ kind: z.literal("users"), userIds: z.array(z.string().uuid()).min(1) }),
        ]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { notifyStudents } = await service();

    if (data.alsoAnnouncement) {
      const db = await admin();
      await db.from("announcements").insert({ title: data.title, message: data.message });
    }

    return notifyStudents({
      target: data.target,
      type: "announcement",
      title: data.title.startsWith("📢") ? data.title : `📢 ${data.title}`,
      body: data.message,
      url: data.url || "/app",
      metadata: { manual: true },
    });
  });

export const adminPreviewAudience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        target: z.discriminatedUnion("kind", [
          z.object({ kind: z.literal("all") }),
          z.object({ kind: z.literal("standards"), standardIds: z.array(z.string().uuid()).min(1) }),
          z.object({ kind: z.literal("subject"), subjectId: z.string().uuid() }),
          z.object({ kind: z.literal("chapter"), chapterId: z.string().uuid() }),
          z.object({ kind: z.literal("users"), userIds: z.array(z.string().uuid()).min(1) }),
        ]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { resolveRecipients } = await service();
    const ids = await resolveRecipients(data.target);
    return { count: ids.length };
  });
