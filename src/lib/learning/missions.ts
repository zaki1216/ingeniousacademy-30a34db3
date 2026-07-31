/**
 * Daily mission definitions — shared by the server engine and the UI.
 * Config-driven so new missions can be added without touching components.
 */

export const MINUTES_PER_LESSON = 12;

export type MissionCode = "watch_lessons" | "earn_xp" | "clear_chapter" | "keep_streak";

export interface MissionDef {
  code: MissionCode;
  label: string;
  description: string;
  icon: string;
  target: number;
  xp: number;
  coins: number;
}

export const MISSION_DEFS: MissionDef[] = [
  {
    code: "watch_lessons",
    label: "Watch 2 Lessons",
    description: "Finish two lessons today",
    icon: "📘",
    target: 2,
    xp: 40,
    coins: 15,
  },
  {
    code: "earn_xp",
    label: "Earn 100 XP",
    description: "Gather 100 XP from any activity",
    icon: "⚡",
    target: 100,
    xp: 30,
    coins: 20,
  },
  {
    code: "clear_chapter",
    label: "Defeat 1 Guardian",
    description: "Complete a chapter and claim its reward",
    icon: "🛡",
    target: 1,
    xp: 80,
    coins: 40,
  },
  {
    code: "keep_streak",
    label: "Keep your Streak",
    description: "Visit the Academy today",
    icon: "🔥",
    target: 1,
    xp: 10,
    coins: 5,
  },
];
