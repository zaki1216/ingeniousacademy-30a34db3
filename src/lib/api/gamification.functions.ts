import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { levelFromXp } from "@/lib/gamification/leveling";
import { getMultipliers } from "@/lib/gamification/talents";

async function loadUnlockedTalents(userId: string): Promise<Record<string, number>> {
  const { data } = await supabaseAdmin
    .from("user_talents")
    .select("talent_code, tier")
    .eq("user_id", userId);
  const map: Record<string, number> = {};
  for (const row of data ?? []) map[row.talent_code] = row.tier;
  return map;
}

type RewardSummary = {
  xpAwarded: number;
  coinsAwarded: number;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  newXp: number;
  newCoins: number;
  newAchievements: { code: string; name: string; description: string; icon: string }[];
  weeklyStreakBonus: { xp: number; coins: number; streakDays: number } | null;
};

async function ensureStatsRow(userId: string) {
  const { data } = await supabaseAdmin
    .from("gamification_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return data;
  const { data: inserted, error } = await supabaseAdmin
    .from("gamification_stats")
    .insert({ user_id: userId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return inserted;
}

type WeeklyBonus = { xp: number; coins: number; streakDays: number };

const WEEKLY_STREAK_BONUS_XP = 150;
const WEEKLY_STREAK_BONUS_COINS = 75;

async function applyStreak(
  userId: string,
): Promise<{ streak_days: number; max_streak: number; weeklyBonus: WeeklyBonus | null }> {
  const stats = await ensureStatsRow(userId);
  const today = new Date().toISOString().slice(0, 10);
  const last = stats.last_active_date;
  let streak = stats.streak_days ?? 0;
  if (last === today) {
    return { streak_days: streak, max_streak: stats.max_streak ?? streak, weeklyBonus: null };
  }
  const prevStreak = streak;
  const unlocked = await loadUnlockedTalents(userId);
  const { streakShield } = getMultipliers(unlocked);
  if (last) {
    const lastDate = new Date(last + "T00:00:00Z");
    const todayDate = new Date(today + "T00:00:00Z");
    const diff = Math.round((todayDate.getTime() - lastDate.getTime()) / 86400000);
    // Shield forgives up to `streakShield` missed days (diff 2..1+shield keeps streak).
    if (diff === 1) streak = streak + 1;
    else if (diff > 1 && diff <= 1 + streakShield) streak = streak + 1;
    else streak = 1;
  } else {
    streak = 1;
  }
  const max_streak = Math.max(stats.max_streak ?? 0, streak);
  await supabaseAdmin
    .from("gamification_stats")
    .update({ streak_days: streak, max_streak, last_active_date: today, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  const weeklyBonus =
    streak > prevStreak && streak % 7 === 0
      ? { xp: WEEKLY_STREAK_BONUS_XP, coins: WEEKLY_STREAK_BONUS_COINS, streakDays: streak }
      : null;

  return { streak_days: streak, max_streak, weeklyBonus };
}

async function awardWeeklyStreakBonus(userId: string, bonus: WeeklyBonus) {
  const stats = await ensureStatsRow(userId);
  const newXp = stats.xp + bonus.xp;
  const newCoins = stats.coins + bonus.coins;
  await supabaseAdmin
    .from("gamification_stats")
    .update({ xp: newXp, coins: newCoins, level: levelFromXp(newXp), updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  await supabaseAdmin.from("xp_transactions").insert({
    user_id: userId, amount: bonus.xp, reason: "weekly_streak", metadata: { streakDays: bonus.streakDays },
  });
  await supabaseAdmin.from("coin_transactions").insert({
    user_id: userId, amount: bonus.coins, reason: "weekly_streak", metadata: { streakDays: bonus.streakDays },
  });
}

async function evaluateAchievements(userId: string): Promise<RewardSummary["newAchievements"]> {
  // Compute progress for each requirement type
  const [statsRes, vcRes, resultsRes, coinTxRes, uaRes, achRes] = await Promise.all([
    supabaseAdmin.from("gamification_stats").select("*").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("video_completions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabaseAdmin.from("results").select("percentage, test:tests(is_boss)").eq("student_id", userId),
    supabaseAdmin.from("coin_transactions").select("amount").eq("user_id", userId).gt("amount", 0),
    supabaseAdmin.from("user_achievements").select("achievement_id").eq("user_id", userId),
    supabaseAdmin.from("achievements").select("*"),
  ]);

  const stats = statsRes.data;
  const videosWatched = vcRes.count ?? 0;
  const results = (resultsRes.data ?? []) as { percentage: number; test: { is_boss: boolean } | null }[];
  const quizzesTaken = results.length;
  const perfectQuizzes = results.filter((r) => Number(r.percentage) >= 100).length;
  const bossesDefeated = results.filter((r) => r.test?.is_boss).length;
  const coinsEarned = (coinTxRes.data ?? []).reduce((s, r) => s + r.amount, 0);
  const owned = new Set((uaRes.data ?? []).map((r) => r.achievement_id));
  const achievements = achRes.data ?? [];

  const metricFor = (type: string): number => {
    switch (type) {
      case "videos_watched": return videosWatched;
      case "quizzes_taken": return quizzesTaken;
      case "perfect_quizzes": return perfectQuizzes;
      case "streak_days": return stats?.streak_days ?? 0;
      case "level": return stats?.level ?? 1;
      case "coins_earned": return coinsEarned;
      case "bosses_defeated": return bossesDefeated;
      default: return 0;
    }
  };

  const toUnlock = achievements.filter((a) => !owned.has(a.id) && metricFor(a.requirement_type) >= a.requirement_value);
  if (toUnlock.length === 0) return [];

  await supabaseAdmin
    .from("user_achievements")
    .insert(toUnlock.map((a) => ({ user_id: userId, achievement_id: a.id })));

  // Apply achievement bonus rewards
  const bonusXp = toUnlock.reduce((s, a) => s + a.xp_reward, 0);
  const bonusCoins = toUnlock.reduce((s, a) => s + a.coin_reward, 0);
  if (bonusXp > 0 || bonusCoins > 0) {
    const newXp = (stats?.xp ?? 0) + bonusXp;
    const newCoins = (stats?.coins ?? 0) + bonusCoins;
    await supabaseAdmin
      .from("gamification_stats")
      .update({ xp: newXp, level: levelFromXp(newXp), coins: newCoins, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (bonusXp > 0) {
      await supabaseAdmin.from("xp_transactions").insert(
        toUnlock.filter((a) => a.xp_reward > 0).map((a) => ({
          user_id: userId, amount: a.xp_reward, reason: "achievement", metadata: { code: a.code },
        })),
      );
    }
    if (bonusCoins > 0) {
      await supabaseAdmin.from("coin_transactions").insert(
        toUnlock.filter((a) => a.coin_reward > 0).map((a) => ({
          user_id: userId, amount: a.coin_reward, reason: "achievement", metadata: { code: a.code },
        })),
      );
    }
  }

  return toUnlock.map((a) => ({ code: a.code, name: a.name, description: a.description, icon: a.icon }));
}

async function grantRewards(
  userId: string,
  xpAmount: number,
  coinAmount: number,
  reason: string,
  metadata?: Record<string, string | number | boolean>,
): Promise<RewardSummary> {
  const streakResult = await applyStreak(userId);
  if (streakResult.weeklyBonus) {
    await awardWeeklyStreakBonus(userId, streakResult.weeklyBonus);
  }
  const before = await ensureStatsRow(userId);
  // Apply talent multipliers to base rewards.
  const unlockedTalents = await loadUnlockedTalents(userId);
  const { xpMult, coinMult } = getMultipliers(unlockedTalents);
  xpAmount = Math.round(xpAmount * xpMult);
  coinAmount = Math.round(coinAmount * coinMult);
  const newXp = before.xp + xpAmount;
  const newCoins = before.coins + coinAmount;
  const newLevel = levelFromXp(newXp);

  await supabaseAdmin
    .from("gamification_stats")
    .update({ xp: newXp, coins: newCoins, level: newLevel, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (xpAmount > 0) {
    await supabaseAdmin.from("xp_transactions").insert({ user_id: userId, amount: xpAmount, reason, metadata });
  }
  if (coinAmount > 0) {
    await supabaseAdmin.from("coin_transactions").insert({ user_id: userId, amount: coinAmount, reason, metadata });
  }

  const newAchievements = await evaluateAchievements(userId);
  // Re-read in case achievements added xp/coins
  const after = await ensureStatsRow(userId);

  // Compute pre-grant level for accurate level-up detection (before streak bonus already applied to `before`)
  const preGrantLevel = streakResult.weeklyBonus
    ? levelFromXp(before.xp - streakResult.weeklyBonus.xp)
    : before.level;

  return {
    xpAwarded: xpAmount + (streakResult.weeklyBonus?.xp ?? 0),
    coinsAwarded: coinAmount + (streakResult.weeklyBonus?.coins ?? 0),
    leveledUp: after.level > preGrantLevel,
    oldLevel: preGrantLevel,
    newLevel: after.level,
    newXp: after.xp,
    newCoins: after.coins,
    newAchievements,
    weeklyStreakBonus: streakResult.weeklyBonus,
  };
}

// ---------- Record video completion ----------
export const completeVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ lectureId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: existing } = await supabaseAdmin
      .from("video_completions")
      .select("id")
      .eq("user_id", userId)
      .eq("lecture_id", data.lectureId)
      .maybeSingle();
    if (existing) {
      const stats = await ensureStatsRow(userId);
      return {
        alreadyCompleted: true,
        xpAwarded: 0, coinsAwarded: 0, leveledUp: false,
        oldLevel: stats.level, newLevel: stats.level, newXp: stats.xp, newCoins: stats.coins,
        newAchievements: [],
        weeklyStreakBonus: null,
      };
    }
    await supabaseAdmin.from("video_completions").insert({ user_id: userId, lecture_id: data.lectureId });

    // Check chapter completion bonus
    const { data: lec } = await supabaseAdmin
      .from("lectures").select("chapter_id").eq("id", data.lectureId).single();
    let xp = 50, coins = 10;
    const reason: string = "video_complete";
    if (lec?.chapter_id) {
      const { data: chapterLecs } = await supabaseAdmin
        .from("lectures").select("id").eq("chapter_id", lec.chapter_id);
      const lecIds = (chapterLecs ?? []).map((l) => l.id);
      const { count: doneCount } = await supabaseAdmin
        .from("video_completions").select("id", { count: "exact", head: true })
        .eq("user_id", userId).in("lecture_id", lecIds);
      if (lecIds.length > 0 && (doneCount ?? 0) === lecIds.length) {
        xp += 100; coins += 50;
      }
    }
    const result = await grantRewards(userId, xp, coins, reason, { lectureId: data.lectureId });
    return { alreadyCompleted: false, ...result };
  });

// ---------- Award quiz rewards (called after submitTest) ----------
export const awardQuizRewards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    testId: z.string().uuid(),
    percentage: z.number().min(0).max(100),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    // Has this user already been awarded for this test?
    const { data: existing } = await supabaseAdmin
      .from("xp_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("reason", "quiz_complete")
      .contains("metadata", { testId: data.testId })
      .maybeSingle();
    if (existing) {
      const stats = await ensureStatsRow(userId);
      return {
        alreadyAwarded: true,
        xpAwarded: 0, coinsAwarded: 0, leveledUp: false,
        oldLevel: stats.level, newLevel: stats.level, newXp: stats.xp, newCoins: stats.coins,
        newAchievements: [],
        weeklyStreakBonus: null,
      };
    }
    const { data: test } = await supabaseAdmin
      .from("tests").select("is_boss").eq("id", data.testId).single();
    let xp = 30, coins = 10;
    if (data.percentage >= 80) { xp += 20; coins += 10; }
    if (test?.is_boss) { xp += 100; coins += 50; }
    const result = await grantRewards(userId, xp, coins, "quiz_complete", { testId: data.testId, percentage: data.percentage });
    return { alreadyAwarded: false, ...result };
  });

// ---------- Daily check-in (no rewards, just streak + weekly bonus) ----------
export const dailyCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureStatsRow(context.userId);
    const streak = await applyStreak(context.userId);
    if (streak.weeklyBonus) {
      await awardWeeklyStreakBonus(context.userId, streak.weeklyBonus);
    }
    const newAchievements = await evaluateAchievements(context.userId);
    return {
      streak_days: streak.streak_days,
      max_streak: streak.max_streak,
      weeklyStreakBonus: streak.weeklyBonus,
      newAchievements,
    };
  });

// ---------- Dashboard ----------
export const getGamificationDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const stats = await ensureStatsRow(userId);

    const { data: recent } = await supabaseAdmin
      .from("user_achievements")
      .select("unlocked_at, achievement:achievements(code, name, description, icon)")
      .eq("user_id", userId)
      .order("unlocked_at", { ascending: false })
      .limit(5);

    // Subject progress
    const { data: profile } = await supabaseAdmin
      .from("profiles").select("standard_id").eq("id", userId).maybeSingle();
    let subjectProgress: { id: string; name: string; total: number; watched: number }[] = [];
    if (profile?.standard_id) {
      const { data: subjects } = await supabaseAdmin
        .from("subjects").select("id, subject_name").eq("standard_id", profile.standard_id);
      const subjectIds = (subjects ?? []).map((s) => s.id);
      const { data: chapters } = subjectIds.length
        ? await supabaseAdmin.from("chapters").select("id, subject_id").in("subject_id", subjectIds)
        : { data: [] as { id: string; subject_id: string }[] };
      const chapterIds = (chapters ?? []).map((c) => c.id);
      const { data: lectures } = chapterIds.length
        ? await supabaseAdmin.from("lectures").select("id, chapter_id").in("chapter_id", chapterIds)
        : { data: [] as { id: string; chapter_id: string }[] };
      const lectureIds = (lectures ?? []).map((l) => l.id);
      const { data: completions } = lectureIds.length
        ? await supabaseAdmin.from("video_completions").select("lecture_id").eq("user_id", userId).in("lecture_id", lectureIds)
        : { data: [] as { lecture_id: string }[] };
      const doneSet = new Set((completions ?? []).map((c) => c.lecture_id));
      subjectProgress = (subjects ?? []).map((s) => {
        const subChapters = (chapters ?? []).filter((c) => c.subject_id === s.id).map((c) => c.id);
        const subLectures = (lectures ?? []).filter((l) => subChapters.includes(l.chapter_id));
        const watched = subLectures.filter((l) => doneSet.has(l.id)).length;
        return { id: s.id, name: s.subject_name, total: subLectures.length, watched };
      });
    }

    return {
      stats: {
        xp: stats.xp, level: stats.level, coins: stats.coins,
        streak_days: stats.streak_days, max_streak: stats.max_streak,
        last_active_date: stats.last_active_date,
      },
      recentAchievements: recent ?? [],
      subjectProgress,
    };
  });

// ---------- Leaderboard (same standard) ----------
export const getLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ period: z.enum(["weekly", "monthly", "all"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: me } = await supabaseAdmin
      .from("profiles").select("standard_id").eq("id", userId).maybeSingle();
    if (!me?.standard_id) return { period: data.period, rows: [], myRank: null };
    const { data: classmates } = await supabaseAdmin
      .from("profiles").select("id, name").eq("standard_id", me.standard_id).eq("is_active", true);
    const ids = (classmates ?? []).map((c) => c.id);
    if (ids.length === 0) return { period: data.period, rows: [], myRank: null };

    let xpByUser = new Map<string, number>();
    if (data.period === "all") {
      const { data: stats } = await supabaseAdmin
        .from("gamification_stats").select("user_id, xp").in("user_id", ids);
      xpByUser = new Map((stats ?? []).map((s) => [s.user_id, s.xp]));
    } else {
      const since = new Date();
      if (data.period === "weekly") since.setDate(since.getDate() - 7);
      else since.setDate(since.getDate() - 30);
      const { data: txs } = await supabaseAdmin
        .from("xp_transactions").select("user_id, amount").in("user_id", ids).gte("created_at", since.toISOString());
      for (const t of txs ?? []) xpByUser.set(t.user_id, (xpByUser.get(t.user_id) ?? 0) + t.amount);
    }

    const { data: allStats } = await supabaseAdmin
      .from("gamification_stats").select("user_id, level").in("user_id", ids);
    const levelByUser = new Map((allStats ?? []).map((s) => [s.user_id, s.level]));

    const rows = (classmates ?? [])
      .map((c) => ({ user_id: c.id, name: c.name, xp: xpByUser.get(c.id) ?? 0, level: levelByUser.get(c.id) ?? 1 }))
      .sort((a, b) => b.xp - a.xp)
      .map((r, i) => ({ ...r, rank: i + 1, isMe: r.user_id === userId }));

    const myRank = rows.find((r) => r.isMe)?.rank ?? null;
    return { period: data.period, rows: rows.slice(0, 50), myRank };
  });

// ---------- Coin history ----------
export const getCoinHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("coin_transactions")
      .select("id, amount, reason, metadata, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    return { transactions: data ?? [] };
  });

// ---------- Achievement gallery ----------
export const getAchievementsGallery = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [allRes, ownedRes] = await Promise.all([
      supabaseAdmin.from("achievements").select("*").order("category").order("requirement_value"),
      supabaseAdmin.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", context.userId),
    ]);
    const ownedMap = new Map((ownedRes.data ?? []).map((u) => [u.achievement_id, u.unlocked_at]));
    return {
      achievements: (allRes.data ?? []).map((a) => ({
        ...a, unlocked: ownedMap.has(a.id), unlocked_at: ownedMap.get(a.id) ?? null,
      })),
    };
  });

// ---------- Boss quiz availability for a chapter ----------
export const getBossQuizStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ chapterId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: lectures } = await supabaseAdmin
      .from("lectures").select("id").eq("chapter_id", data.chapterId);
    const lecIds = (lectures ?? []).map((l) => l.id);
    const { count: doneCount } = lecIds.length
      ? await supabaseAdmin.from("video_completions").select("id", { count: "exact", head: true })
          .eq("user_id", userId).in("lecture_id", lecIds)
      : { count: 0 };
    const allWatched = lecIds.length > 0 && doneCount === lecIds.length;
    const { data: bossTest } = await supabaseAdmin
      .from("tests").select("id, title, total_marks").eq("chapter_id", data.chapterId).eq("is_boss", true).maybeSingle();
    return { unlocked: allWatched && !!bossTest, bossTest, totalLectures: lecIds.length, lecturesWatched: doneCount ?? 0 };
  });
