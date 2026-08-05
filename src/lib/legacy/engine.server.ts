/**
 * Academy Legacy — server-only engine.
 *
 * Recognition layer only. It reads the existing Hero Profile projection and
 * writes *permanent* records (legacy events, certificates, titles). It never
 * touches XP, coins, progress, attendance or the curriculum, and it never
 * unlocks or restricts academic content.
 *
 * Everything is idempotent: legacy events are unique per (user, code), and
 * certificates are unique per (user, subject), so re-syncing is safe and
 * entries can never disappear or duplicate.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ACHIEVEMENTS, BADGES, evaluateAll } from "@/lib/hero/catalog";
import { computeHeroProfile } from "@/lib/hero/profile.server";
import { rankFromXp } from "@/lib/rpg/academyRanks";
import {
  PURCHASE_MILESTONES,
  QUEST_MILESTONES,
  type LegacyCertificate,
  type LegacyEvent,
  type LegacyHallEntry,
  type LegacySettings,
  type LegacyState,
  type LegacyTitle,
} from "@/lib/legacy/config";

const DEFAULT_SETTINGS: LegacySettings = {
  headmaster_name: "The Headmaster",
  headmaster_signature: "Ingenious Academy",
  seal_text: "Ingenious Academy",
  graduation_threshold: 100,
  celebrations_enabled: true,
  ceremony_enabled: true,
  hall_categories: ["certificates", "titles", "badges", "trophies", "awards"],
  certificate_note:
    "Awarded for outstanding dedication and the completion of every Quest in this subject.",
};

type Candidate = {
  kind: string;
  code: string;
  icon: string;
  title: string;
  detail: string | null;
  occurred_at: string;
};

export async function loadSettings(): Promise<LegacySettings> {
  const { data } = await supabaseAdmin
    .from("legacy_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  return {
    headmaster_name: data.headmaster_name,
    headmaster_signature: data.headmaster_signature,
    seal_text: data.seal_text,
    graduation_threshold: data.graduation_threshold,
    celebrations_enabled: data.celebrations_enabled,
    ceremony_enabled: data.ceremony_enabled,
    hall_categories: Array.isArray(data.hall_categories)
      ? (data.hall_categories as string[])
      : DEFAULT_SETTINGS.hall_categories,
    certificate_note: data.certificate_note,
  };
}

function serialFor(userId: string, subjectId: string | null, year: number): string {
  const a = userId.replace(/-/g, "").slice(0, 6).toUpperCase();
  const b = (subjectId ?? "general").replace(/-/g, "").slice(0, 4).toUpperCase();
  return `IA-${year}-${a}-${b}`;
}

/** Map a title requirement onto the Hero Profile projection. */
function titleUnlocked(
  requirementType: string | null,
  requirementValue: number | null,
  ctx: { lessons: number; dungeons: number; trials: number; graduations: number; xp: number; level: number },
): boolean {
  const need = requirementValue ?? 1;
  switch (requirementType) {
    case "lessons":
      return ctx.lessons >= need;
    case "dungeons":
      return ctx.dungeons >= need;
    case "master_trials":
      return ctx.trials >= need;
    case "graduations":
      return ctx.graduations >= need;
    case "xp":
      return ctx.xp >= need;
    case "level":
      return ctx.level >= need;
    default:
      return false;
  }
}

export async function syncAndGetLegacy(userId: string): Promise<LegacyState> {
  const hero = await computeHeroProfile(userId);
  const settings = await loadSettings();

  const [existingEventsRes, certsRes, invRes, titlesRes, userTitlesRes, dormRes] = await Promise.all([
    supabaseAdmin
      .from("legacy_events")
      .select("id, kind, code, icon, title, detail, occurred_at")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false }),
    supabaseAdmin
      .from("certificates")
      .select("*")
      .eq("user_id", userId)
      .order("issued_at", { ascending: false }),
    supabaseAdmin.from("user_inventory").select("item_id").eq("user_id", userId),
    supabaseAdmin
      .from("titles")
      .select("code, name, description, icon, rarity, requirement_type, requirement_value, enabled, sort_order")
      .eq("enabled", true)
      .order("sort_order", { ascending: true }),
    supabaseAdmin.from("user_titles").select("title_code, unlocked_at").eq("user_id", userId),
    supabaseAdmin.from("dorm_layouts").select("slots").eq("user_id", userId).maybeSingle(),
  ]);

  const existingCodes = new Set((existingEventsRes.data ?? []).map((e) => e.code));
  const purchases = (invRes.data ?? []).length;
  const now = new Date().toISOString();

  // ---------- Graduations ----------
  const graduated = hero.journey.buildings.filter(
    (b) => b.total > 0 && b.percent >= settings.graduation_threshold,
  );

  // ---------- Candidate legacy entries ----------
  const candidates: Candidate[] = [];
  const push = (c: Candidate) => {
    if (!existingCodes.has(c.code)) candidates.push(c);
  };

  for (const t of hero.timeline) {
    if (t.kind === "join") {
      push({ kind: "join", code: "join", icon: "📅", title: "Joined Ingenious Academy", detail: t.detail, occurred_at: t.at });
    } else if (t.kind === "dungeon") {
      push({ kind: "dungeon", code: `dungeon_${t.id.replace("dungeon-", "")}`, icon: "📘", title: t.title, detail: "Dungeon cleared", occurred_at: t.at });
      push({ kind: "trial", code: `trial_${t.id.replace("dungeon-", "")}`, icon: "👑", title: `${t.title.replace(/^Cleared /, "")} Master Trial`, detail: "Master Trial completed", occurred_at: t.at });
    } else if (t.kind === "rank") {
      push({ kind: "rank", code: `rank_${t.id.replace("rank-", "")}`, icon: "🏅", title: t.title, detail: t.detail, occurred_at: t.at });
    }
  }

  const firstQuest = hero.timeline.find((t) => t.id === "quest-first");
  for (const n of QUEST_MILESTONES) {
    if (hero.stats.lessonsCompleted >= n) {
      push({
        kind: "quest",
        code: `quest_${n}`,
        icon: n === 1 ? "📖" : "🗺️",
        title: n === 1 ? "Completed the first Quest" : `${n} Quests completed`,
        detail: n === 1 ? "Your adventure begins" : "A milestone on the Adventure Map",
        occurred_at: n === 1 ? (firstQuest?.at ?? now) : now,
      });
    }
  }

  for (const n of PURCHASE_MILESTONES) {
    if (purchases >= n) {
      push({
        kind: "marketplace",
        code: `purchase_${n}`,
        icon: "🛍️",
        title: n === 1 ? "First Marketplace purchase" : `${n} Marketplace treasures collected`,
        detail: "Academy Marketplace milestone",
        occurred_at: now,
      });
    }
  }

  for (const g of graduated) {
    push({
      kind: "graduation",
      code: `graduation_${g.id}`,
      icon: "🎓",
      title: `Graduated ${g.name}`,
      detail: "Every Quest in this building completed",
      occurred_at: now,
    });
  }

  const achievements = evaluateAll(ACHIEVEMENTS, hero.stats, hero.journey);
  for (const a of achievements) {
    if (a.unlocked && (a.rarity === "epic" || a.rarity === "legendary")) {
      push({
        kind: "achievement",
        code: `achievement_${a.code}`,
        icon: a.icon,
        title: a.name,
        detail: a.description,
        occurred_at: now,
      });
    }
  }

  const slots = (dormRes.data?.slots ?? {}) as Record<string, unknown>;
  if (Object.values(slots).some((v) => typeof v === "string" && v)) {
    push({ kind: "dorm", code: "dorm_decorated", icon: "🏡", title: "Decorated My Academy", detail: "Your quarters started to feel like home", occurred_at: now });
  }

  // ---------- Titles ----------
  const titleRows = titlesRes.data ?? [];
  const ownedTitles = new Map((userTitlesRes.data ?? []).map((t) => [t.title_code, t.unlocked_at]));
  const ctx = {
    lessons: hero.stats.lessonsCompleted,
    dungeons: hero.stats.dungeonsCleared,
    trials: hero.stats.masterTrialsWon,
    graduations: graduated.length,
    xp: hero.stats.xp,
    level: hero.stats.level,
  };

  const newTitles = titleRows.filter(
    (t) => !ownedTitles.has(t.code) && titleUnlocked(t.requirement_type, t.requirement_value, ctx),
  );
  if (newTitles.length) {
    await supabaseAdmin
      .from("user_titles")
      .upsert(
        newTitles.map((t) => ({ user_id: userId, title_code: t.code })),
        { onConflict: "user_id,title_code", ignoreDuplicates: true },
      );
    for (const t of newTitles) {
      push({
        kind: "title",
        code: `title_${t.code}`,
        icon: t.icon || "🎖️",
        title: `Earned the title “${t.name}”`,
        detail: t.description,
        occurred_at: now,
      });
      ownedTitles.set(t.code, now);
    }
  }

  // ---------- Persist new legacy events ----------
  const fresh: string[] = [];
  if (candidates.length) {
    const { data: inserted } = await supabaseAdmin
      .from("legacy_events")
      .upsert(
        candidates.map((c) => ({ ...c, user_id: userId })),
        { onConflict: "user_id,code", ignoreDuplicates: true },
      )
      .select("code");
    for (const r of inserted ?? []) fresh.push(r.code);
  }

  // ---------- Certificates ----------
  const existingCerts = certsRes.data ?? [];
  const certSubjects = new Set(existingCerts.map((c) => c.subject_id));
  const ranksRes = await supabaseAdmin
    .from("academy_ranks")
    .select("code, name, icon, color, gradient, xp_required, sort_order, enabled, message, id")
    .eq("enabled", true);
  const rank = rankFromXp(hero.stats.xp, (ranksRes.data ?? []) as never);

  const missingCerts = graduated.filter((g) => !certSubjects.has(g.id));
  if (missingCerts.length) {
    const year = new Date().getFullYear();
    await supabaseAdmin.from("certificates").upsert(
      missingCerts.map((g) => ({
        user_id: userId,
        subject_id: g.id,
        subject_name: g.name,
        standard_name: hero.identity.standardName,
        student_name: hero.identity.name,
        username: hero.identity.username,
        rank_name: rank?.name ?? null,
        serial: serialFor(userId, g.id, year),
      })),
      { onConflict: "user_id,subject_id", ignoreDuplicates: true },
    );
  }

  // ---------- Reload the permanent record ----------
  const [eventsRes, finalCertsRes] = await Promise.all([
    supabaseAdmin
      .from("legacy_events")
      .select("id, kind, code, icon, title, detail, occurred_at")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(200),
    supabaseAdmin
      .from("certificates")
      .select("id, subject_id, subject_name, standard_name, student_name, username, rank_name, serial, issued_at")
      .eq("user_id", userId)
      .order("issued_at", { ascending: false }),
  ]);

  const events = (eventsRes.data ?? []) as LegacyEvent[];
  const certificates = (finalCertsRes.data ?? []) as LegacyCertificate[];

  const titles: LegacyTitle[] = titleRows.map((t) => ({
    code: t.code,
    name: t.name,
    description: t.description,
    icon: t.icon || "🎖️",
    rarity: t.rarity,
    unlocked: ownedTitles.has(t.code),
    equipped: hero.identity.title === t.name,
    unlocked_at: ownedTitles.get(t.code) ?? null,
    requirement:
      t.requirement_type && t.requirement_value
        ? `${t.requirement_value} ${t.requirement_type.replace(/_/g, " ")}`
        : null,
  }));

  // ---------- Hall of Fame ----------
  const badges = evaluateAll(BADGES, hero.stats, hero.journey).filter(
    (b) => b.unlocked && (b.rarity === "epic" || b.rarity === "legendary"),
  );
  const hall: LegacyHallEntry[] = [
    ...certificates.map((c) => ({
      id: `cert-${c.id}`,
      category: "certificates",
      icon: "🎓",
      name: c.subject_name,
      detail: `Graduated · ${new Date(c.issued_at).toLocaleDateString()}`,
    })),
    ...titles
      .filter((t) => t.unlocked)
      .map((t) => ({ id: `title-${t.code}`, category: "titles", icon: t.icon, name: t.name, detail: t.description })),
    ...badges.map((b) => ({ id: `badge-${b.code}`, category: "badges", icon: b.icon, name: b.name, detail: b.description })),
    ...events
      .filter((e) => e.kind === "dungeon")
      .slice(0, 12)
      .map((e) => ({ id: `trophy-${e.id}`, category: "trophies", icon: "🏆", name: e.title.replace(/^Cleared /, ""), detail: "Dungeon cleared" })),
    ...events
      .filter((e) => e.kind === "award")
      .map((e) => ({ id: `award-${e.id}`, category: "awards", icon: e.icon, name: e.title, detail: e.detail })),
  ];

  return {
    settings,
    events,
    certificates,
    titles,
    hall,
    summary: {
      graduations: graduated.length,
      dungeons: events.filter((e) => e.kind === "dungeon").length,
      masterTrials: events.filter((e) => e.kind === "trial").length,
      promotions: events.filter((e) => e.kind === "rank").length,
      purchases,
      achievements: events.filter((e) => e.kind === "achievement").length,
      awards: events.filter((e) => e.kind === "award").length,
      certificates: certificates.length,
      titles: titles.filter((t) => t.unlocked).length,
    },
    fresh,
  };
}

/** Equip (or clear) an owned Academy Title. Cosmetic only. */
export async function equipAcademyTitle(userId: string, code: string | null): Promise<{ title: string | null }> {
  if (!code) {
    await supabaseAdmin.from("profiles").update({ equipped_title: null }).eq("id", userId);
    return { title: null };
  }
  const { data: owned } = await supabaseAdmin
    .from("user_titles")
    .select("title_code")
    .eq("user_id", userId)
    .eq("title_code", code)
    .maybeSingle();
  if (!owned) throw new Error("You have not earned this title yet");
  const { data: title } = await supabaseAdmin
    .from("titles")
    .select("name")
    .eq("code", code)
    .maybeSingle();
  if (!title) throw new Error("Unknown title");
  await supabaseAdmin.from("profiles").update({ equipped_title: title.name }).eq("id", userId);
  return { title: title.name };
}

export async function getCertificate(userId: string, id: string) {
  const [{ data: cert }, settings] = await Promise.all([
    supabaseAdmin
      .from("certificates")
      .select("id, subject_id, subject_name, standard_name, student_name, username, rank_name, serial, issued_at")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle(),
    loadSettings(),
  ]);
  if (!cert) throw new Error("Certificate not found");
  return { certificate: cert as LegacyCertificate, settings };
}
