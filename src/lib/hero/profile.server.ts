/**
 * Server-only aggregation for the Academy Hero Profile.
 *
 * Read-only projection over existing systems. Kept out of *.functions.ts so
 * the server-fn splitter only sees thin wrappers.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { MINUTES_PER_LESSON } from "@/lib/learning/missions";
import type { HeroBuildingProgress, HeroProfileResult, HeroTimelineEvent } from "@/lib/hero/types";

function daysBetween(from: string, to = new Date().toISOString()): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.floor((b - a) / 86_400_000));
}

export async function computeHeroProfile(userId: string): Promise<HeroProfileResult> {
  const [profileRes, statsRes, videoRes, chapterRes, attRes, coinRes, xpRes, ranksRes] =
    await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select(
          "name, username, equipped_avatar, equipped_frame, equipped_title, equipped_outfit, equipped_nameplate, equipped_celebration, equipped_badge, standard_id, admission_date, created_at, standard:standards(name)",
        )
        .eq("id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("gamification_stats")
        .select("xp, level, coins, streak_days, max_streak")
        .eq("user_id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("video_completions")
        .select("lecture_id, completed_at")
        .eq("user_id", userId)
        .order("completed_at", { ascending: true }),
      supabaseAdmin
        .from("chapter_completions")
        .select("chapter_id, completed_at, xp_awarded, coins_awarded")
        .eq("user_id", userId)
        .order("completed_at", { ascending: true }),
      supabaseAdmin.from("attendance").select("status").eq("student_id", userId),
      supabaseAdmin.from("coin_transactions").select("amount, reason").eq("user_id", userId),
      supabaseAdmin.from("xp_transactions").select("amount").eq("user_id", userId),
      supabaseAdmin
        .from("academy_ranks")
        .select("code, name, icon, xp_required, enabled, sort_order")
        .eq("enabled", true)
        .order("xp_required", { ascending: true }),
    ]);

  const profile = profileRes.data;
  const stats = statsRes.data;
  const videos = videoRes.data ?? [];
  const chapterCompletions = chapterRes.data ?? [];
  const attendance = attRes.data ?? [];
  const coinTx = coinRes.data ?? [];
  const xpTx = xpRes.data ?? [];
  const ranks = ranksRes.data ?? [];

  // ---------- Building (subject) progress ----------
  const doneLectures = new Set(videos.map((v) => v.lecture_id));
  let buildings: HeroBuildingProgress[] = [];
  const chapterNames = new Map<string, string>();

  if (profile?.standard_id) {
    const { data: subjects } = await supabaseAdmin
      .from("subjects")
      .select("id, subject_name")
      .eq("standard_id", profile.standard_id);
    const subjectIds = (subjects ?? []).map((s) => s.id);
    const { data: chapters } = subjectIds.length
      ? await supabaseAdmin
          .from("chapters")
          .select("id, chapter_name, subject_id")
          .in("subject_id", subjectIds)
      : { data: [] as { id: string; chapter_name: string; subject_id: string }[] };
    const chapterIds = (chapters ?? []).map((c) => c.id);
    for (const c of chapters ?? []) chapterNames.set(c.id, c.chapter_name ?? "Dungeon");
    const { data: lectures } = chapterIds.length
      ? await supabaseAdmin.from("lectures").select("id, chapter_id").in("chapter_id", chapterIds)
      : { data: [] as { id: string; chapter_id: string }[] };

    buildings = (subjects ?? []).map((s) => {
      const subChapters = new Set(
        (chapters ?? []).filter((c) => c.subject_id === s.id).map((c) => c.id),
      );
      const subLectures = (lectures ?? []).filter((l) => subChapters.has(l.chapter_id));
      const done = subLectures.filter((l) => doneLectures.has(l.id)).length;
      return {
        id: s.id,
        name: s.subject_name ?? "",
        total: subLectures.length,
        done,
        percent: subLectures.length ? Math.round((done / subLectures.length) * 100) : 0,
      };
    });
  }

  // Missing chapter names (e.g. chapters outside the current standard)
  const missing = chapterCompletions.map((c) => c.chapter_id).filter((id) => !chapterNames.has(id));
  if (missing.length) {
    const { data: extra } = await supabaseAdmin
      .from("chapters")
      .select("id, chapter_name")
      .in("id", missing);
    for (const c of extra ?? []) chapterNames.set(c.id, c.chapter_name ?? "Dungeon");
  }

  const overallTotal = buildings.reduce((s, b) => s + b.total, 0);
  const overallDone = buildings.reduce((s, b) => s + b.done, 0);

  // ---------- Stats ----------
  const presentCount = attendance.filter((a) => a.status === "present").length;
  const xpEarned = xpTx.reduce((s, t) => s + Math.max(0, t.amount ?? 0), 0);
  const coinsEarned = coinTx.reduce((s, t) => s + Math.max(0, t.amount ?? 0), 0);
  const missionsCompleted = coinTx.filter((t) => t.reason === "daily_mission").length;
  const xp = stats?.xp ?? 0;
  const rankPromotions = ranks.filter((r) => xp >= r.xp_required).length;
  const joinedAt = profile?.admission_date
    ? new Date(profile.admission_date).toISOString()
    : (profile?.created_at ?? null);

  const heroStats = {
    xp,
    level: stats?.level ?? 1,
    coins: stats?.coins ?? 0,
    lessonsCompleted: videos.length,
    dungeonsCleared: chapterCompletions.length,
    masterTrialsWon: chapterCompletions.length,
    missionsCompleted,
    studyMinutes: videos.length * MINUTES_PER_LESSON,
    streakDays: stats?.streak_days ?? 0,
    maxStreak: stats?.max_streak ?? 0,
    attendancePct: attendance.length ? Math.round((presentCount / attendance.length) * 100) : 0,
    attendanceDays: presentCount,
    xpEarned,
    coinsEarned,
    rankPromotions,
    daysInAcademy: joinedAt ? daysBetween(joinedAt) : 0,
  };

  // ---------- Timeline ----------
  const timeline: HeroTimelineEvent[] = [];
  if (joinedAt) {
    timeline.push({
      id: "join",
      icon: "🎉",
      title: "Joined Ingenious Academy",
      detail: profile?.standard?.name ? `Enrolled in ${profile.standard.name}` : null,
      at: joinedAt,
      kind: "join",
    });
  }

  const firstVideo = videos[0];
  if (firstVideo) {
    timeline.push({
      id: `quest-first`,
      icon: "📖",
      title: "Completed the first Quest",
      detail: "Your adventure begins",
      at: firstVideo.completed_at,
      kind: "quest",
    });
  }

  for (const c of chapterCompletions) {
    const name = chapterNames.get(c.chapter_id) ?? "Dungeon";
    timeline.push({
      id: `dungeon-${c.chapter_id}`,
      icon: "🏰",
      title: `Cleared ${name}`,
      detail: "Master Trial defeated",
      at: c.completed_at,
      kind: "dungeon",
    });
    if ((c.xp_awarded ?? 0) > 0 || (c.coins_awarded ?? 0) > 0) {
      timeline.push({
        id: `chest-${c.chapter_id}`,
        icon: "🎁",
        title: "Opened a Knowledge Chest",
        detail: `+${c.xp_awarded ?? 0} XP · +${c.coins_awarded ?? 0} coins`,
        at: c.completed_at,
        kind: "chest",
      });
    }
  }

  // Rank promotions — anchored to the moment the XP threshold was crossed is
  // not stored, so we show them as achieved milestones ordered by threshold.
  const achievedRanks = ranks.filter((r) => xp >= r.xp_required && r.xp_required > 0);
  for (const r of achievedRanks) {
    timeline.push({
      id: `rank-${r.code}`,
      icon: "🏅",
      title: `Promoted to ${r.name}`,
      detail: `${r.xp_required.toLocaleString()} XP milestone`,
      at: joinedAt ?? new Date().toISOString(),
      kind: "rank",
    });
  }

  timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    identity: {
      name: profile?.name ?? "Cadet",
      username: profile?.username ?? null,
      avatar: profile?.equipped_avatar ?? null,
      frame: profile?.equipped_frame ?? null,
      title: profile?.equipped_title ?? null,
      standardName: profile?.standard?.name ?? null,
      joinedAt,
    },
    stats: heroStats,
    journey: {
      overallTotal,
      overallDone,
      overallPercent: overallTotal ? Math.round((overallDone / overallTotal) * 100) : 0,
      buildings: buildings.sort((a, b) => b.percent - a.percent),
    },
    timeline: timeline.slice(0, 40),
    showcase: {
      avatar: profile?.equipped_avatar ?? null,
      frame: profile?.equipped_frame ?? null,
      title: profile?.equipped_title ?? null,
      outfit: profile?.equipped_outfit ?? null,
      nameplate: profile?.equipped_nameplate ?? null,
      celebration: profile?.equipped_celebration ?? null,
      companion: null,
      dorm: null,
      favoriteBadge: profile?.equipped_badge ?? null,
    },
  };
}
