import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Quest = {
  id: string;
  title: string;
  description: string;
  goal: number;
  progress: number;
  reward_xp: number;
  reward_coins: number;
  done: boolean;
};

function todayUtcDateStr() {
  return new Date().toISOString().slice(0, 10);
}

export const getDailyQuestsAndStreak = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = todayUtcDateStr();
    const startOfDay = `${today}T00:00:00.000Z`;
    const ninetyAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const [vc, rs, xp] = await Promise.all([
      supabase
        .from("video_completions")
        .select("lecture_id, last_watched_at, completed_at")
        .eq("user_id", userId)
        .gte("last_watched_at", startOfDay),
      supabase
        .from("results")
        .select("id, attempt_date, percentage")
        .eq("student_id", userId)
        .gte("attempt_date", startOfDay),
      supabase
        .from("xp_transactions")
        .select("amount, created_at")
        .eq("user_id", userId)
        .gte("created_at", ninetyAgo),
    ]);

    const lecturesWatchedToday = vc.data?.length ?? 0;
    const testsTakenToday = rs.data?.length ?? 0;
    const xpToday = (xp.data ?? [])
      .filter((x) => (x.created_at ?? "").slice(0, 10) === today)
      .reduce((s, x) => s + (x.amount ?? 0), 0);
    const highScoreToday = (rs.data ?? []).some((r) => Number(r.percentage ?? 0) >= 80);

    const quests: Quest[] = [
      {
        id: "watch-1",
        title: "Watch a Lecture",
        description: "Complete 1 lecture today",
        goal: 1,
        progress: Math.min(lecturesWatchedToday, 1),
        reward_xp: 20,
        reward_coins: 10,
        done: lecturesWatchedToday >= 1,
      },
      {
        id: "battle-1",
        title: "Take a Battle",
        description: "Attempt 1 test today",
        goal: 1,
        progress: Math.min(testsTakenToday, 1),
        reward_xp: 30,
        reward_coins: 15,
        done: testsTakenToday >= 1,
      },
      {
        id: "xp-50",
        title: "Earn 50 XP",
        description: "Gain 50 XP from any activity",
        goal: 50,
        progress: Math.min(xpToday, 50),
        reward_xp: 25,
        reward_coins: 10,
        done: xpToday >= 50,
      },
      {
        id: "score-80",
        title: "Score 80%+",
        description: "Get 80% or higher in a battle",
        goal: 1,
        progress: highScoreToday ? 1 : 0,
        reward_xp: 50,
        reward_coins: 25,
        done: highScoreToday,
      },
    ];

    // Streak calendar: build per-day xp totals for last 90 days
    const dayMap = new Map<string, number>();
    for (const x of xp.data ?? []) {
      const day = (x.created_at ?? "").slice(0, 10);
      if (!day) continue;
      dayMap.set(day, (dayMap.get(day) ?? 0) + (x.amount ?? 0));
    }
    const days: { date: string; xp: number }[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      days.push({ date: d, xp: dayMap.get(d) ?? 0 });
    }

    return { quests, days };
  });
