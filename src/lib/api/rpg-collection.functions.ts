import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TitleRow = {
  code: string;
  name: string;
  description: string | null;
  rarity: string;
  requirement_type: string | null;
  requirement_value: number | null;
};

export type ShadowRow = {
  code: string;
  name: string;
  subject: string | null;
  rarity: string;
  description: string | null;
  unlock_rule: string | null;
  icon: string | null;
};

export type SeasonReward = { type: string; code: string };
export type SeasonRow = {
  id: string;
  code: string;
  name: string;
  theme: string | null;
  starts_at: string;
  ends_at: string;
  rewards: SeasonReward[];
};

export const getCollection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [titles, shadows, userTitles, userShadows, seasons, badgesCount] = await Promise.all([
      supabase.from("titles").select("code, name, description, rarity, requirement_type, requirement_value").order("rarity"),
      supabase.from("shadows").select("code, name, subject, rarity, description, unlock_rule, icon").order("rarity"),
      supabase.from("user_titles").select("title_code").eq("user_id", userId),
      supabase.from("user_shadows").select("shadow_code").eq("user_id", userId),
      supabase.from("seasons").select("id, code, name, theme, starts_at, ends_at, rewards").lte("starts_at", new Date().toISOString()).gte("ends_at", new Date().toISOString()).limit(1),
      supabase.from("user_achievements").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    const ownedTitles = new Set((userTitles.data ?? []).map((r) => r.title_code));
    const ownedShadows = new Set((userShadows.data ?? []).map((r) => r.shadow_code));
    const titleRows = (titles.data ?? []) as TitleRow[];
    const shadowRows = (shadows.data ?? []) as ShadowRow[];
    return {
      titles: titleRows.map((t) => ({ ...t, owned: ownedTitles.has(t.code) })),
      shadows: shadowRows.map((s) => ({ ...s, owned: ownedShadows.has(s.code) })),
      currentSeason: (seasons.data?.[0] ?? null) as unknown as SeasonRow | null,
      badgesCount: badgesCount.count ?? 0,
      collectionPct: (() => {
        const total = titleRows.length + shadowRows.length;
        if (!total) return 0;
        return Math.round(((ownedTitles.size + ownedShadows.size) / total) * 100);
      })(),
    };
  });

export const getDailyObjectives = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const sinceIso = since.toISOString();

    const [attendance, videos, results] = await Promise.all([
      supabase.from("attendance").select("status").eq("student_id", userId).eq("date", todayKey),
      supabase.from("video_completions").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", sinceIso),
      supabase.from("results").select("id", { count: "exact", head: true }).eq("student_id", userId).gte("created_at", sinceIso),
    ]);

    const attendedToday = (attendance.data ?? []).some((r) => r.status === "present");
    return {
      objectives: [
        { key: "attend", label: "Attend Class", reward: "+2 Coins", progress: attendedToday ? 1 : 0, goal: 1 },
        { key: "lecture", label: "Watch 1 Lecture", reward: "+50 XP", progress: Math.min(1, videos.count ?? 0), goal: 1 },
        { key: "quiz", label: "Complete 1 Quiz", reward: "+100 XP", progress: Math.min(1, results.count ?? 0), goal: 1 },
        { key: "revise", label: "Revise For 15 Minutes", reward: "+25 XP", progress: 0, goal: 1 },
      ],
    };
  });
