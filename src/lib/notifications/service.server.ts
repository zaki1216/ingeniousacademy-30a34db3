// Centralised Academy notification service.
// Every Academy event goes through notifyStudents(): it stores a notification
// record per recipient (so it is always visible in-app) and then attempts a
// phone push. Push failures never break the caller.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendWebPush, type PushDevice } from "./webpush.server";

export type NotificationTarget =
  | { kind: "all" }
  | { kind: "standards"; standardIds: string[] }
  | { kind: "subject"; subjectId: string }
  | { kind: "chapter"; chapterId: string }
  | { kind: "users"; userIds: string[] };

export type NotifyInput = {
  target: NotificationTarget;
  type: string;
  title: string;
  body: string;
  url?: string | null;
  metadata?: Record<string, unknown>;
  /** When set, the notification is sent at most once for this key (dedupe). */
  eventKey?: string;
};

export type NotifyResult = {
  skipped: boolean;
  recipients: number;
  pushed: number;
  failed: number;
};

async function standardIdsForSubject(subjectId: string): Promise<string[]> {
  const ids = new Set<string>();
  const links = await supabaseAdmin
    .from("subject_standards")
    .select("standard_id")
    .eq("subject_id", subjectId);
  for (const l of links.data ?? []) if (l.standard_id) ids.add(l.standard_id);
  const subject = await supabaseAdmin
    .from("subjects")
    .select("standard_id")
    .eq("id", subjectId)
    .maybeSingle();
  if (subject.data?.standard_id) ids.add(subject.data.standard_id);
  return [...ids];
}

export async function resolveRecipients(target: NotificationTarget): Promise<string[]> {
  if (target.kind === "users") return [...new Set(target.userIds)].filter(Boolean);

  let standardIds: string[] | null = null;
  if (target.kind === "standards") standardIds = target.standardIds.filter(Boolean);
  if (target.kind === "subject") standardIds = await standardIdsForSubject(target.subjectId);
  if (target.kind === "chapter") {
    const ch = await supabaseAdmin
      .from("chapters")
      .select("subject_id, academic_subject_id")
      .eq("id", target.chapterId)
      .maybeSingle();
    if (ch.data?.subject_id) {
      standardIds = await standardIdsForSubject(ch.data.subject_id);
    } else if (ch.data?.academic_subject_id) {
      // Chapter sits directly under a subject of one standard.
      const subj = await supabaseAdmin
        .from("academic_subjects")
        .select("standard_id")
        .eq("id", ch.data.academic_subject_id)
        .maybeSingle();
      standardIds = subj.data?.standard_id ? [subj.data.standard_id] : [];
    } else {
      standardIds = [];
    }
  }

  if (standardIds && standardIds.length === 0) return [];

  let query = supabaseAdmin.from("profiles").select("id").eq("is_active", true);
  if (standardIds) query = query.in("standard_id", standardIds);
  const profiles = await query;
  const candidates = (profiles.data ?? []).map((p) => p.id);
  if (candidates.length === 0) return [];

  // Only students receive Academy notifications.
  const roles = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "student")
    .in("user_id", candidates);
  const students = new Set((roles.data ?? []).map((r) => r.user_id));
  return candidates.filter((id) => students.has(id));
}

/** Returns true when this event was already processed (duplicate). */
async function alreadySent(eventKey: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from("notification_events").insert({ event_key: eventKey });
  if (!error) return false;
  // 23505 = unique violation -> duplicate event
  return (error as { code?: string }).code === "23505";
}

export async function pushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string | null; type?: string },
): Promise<{ pushed: number; failed: number }> {
  if (userIds.length === 0) return { pushed: 0, failed: 0 };
  if (!process.env["VAPID_PUBLIC_KEY"] || !process.env["VAPID_PRIVATE_KEY"]) {
    return { pushed: 0, failed: 0 };
  }

  const subs = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("is_active", true)
    .in("user_id", userIds);

  const devices = subs.data ?? [];
  let pushed = 0;
  let failed = 0;
  const gone: string[] = [];
  const used: string[] = [];

  const CHUNK = 25;
  for (let i = 0; i < devices.length; i += CHUNK) {
    const slice = devices.slice(i, i + CHUNK);
    const results = await Promise.all(
      slice.map((d) => sendWebPush(d as PushDevice, payload).then((r) => ({ d, r }))),
    );
    for (const { d, r } of results) {
      if (r.ok) {
        pushed++;
        used.push(d.id);
      } else {
        failed++;
        if (r.gone) gone.push(d.id);
      }
    }
  }

  if (gone.length) {
    await supabaseAdmin.from("push_subscriptions").update({ is_active: false }).in("id", gone);
  }
  if (used.length) {
    await supabaseAdmin
      .from("push_subscriptions")
      .update({ last_used_at: new Date().toISOString() })
      .in("id", used);
  }
  return { pushed, failed };
}

export async function notifyStudents(input: NotifyInput): Promise<NotifyResult> {
  try {
    if (input.eventKey && (await alreadySent(input.eventKey))) {
      return { skipped: true, recipients: 0, pushed: 0, failed: 0 };
    }

    const recipients = await resolveRecipients(input.target);
    if (recipients.length === 0) return { skipped: false, recipients: 0, pushed: 0, failed: 0 };

    const rows = recipients.map((user_id) => ({
      user_id,
      type: input.type,
      title: input.title,
      body: input.body,
      url: input.url ?? null,
      metadata: (input.metadata ?? {}) as never,
    }));
    for (let i = 0; i < rows.length; i += 200) {
      await supabaseAdmin.from("notifications").insert(rows.slice(i, i + 200));
    }

    const { pushed, failed } = await pushToUsers(recipients, {
      title: input.title,
      body: input.body,
      url: input.url ?? null,
      type: input.type,
    });

    return { skipped: false, recipients: recipients.length, pushed, failed };
  } catch (e) {
    console.error("[notifications] delivery failed", e);
    return { skipped: false, recipients: 0, pushed: 0, failed: 0 };
  }
}
