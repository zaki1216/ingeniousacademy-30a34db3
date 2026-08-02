/**
 * Achievement & Badge catalog for the Academy Hero Profile.
 *
 * Config-driven and future-ready: adding a new achievement or badge only
 * requires a new entry here. Progress is evaluated purely from the Hero
 * Profile projection — no schema change, no new writes.
 */

import type { HeroJourney, HeroStats } from "@/lib/hero/types";

export type Rarity = "common" | "rare" | "epic" | "legendary";

export const RARITY_STYLE: Record<Rarity, { label: string; color: string; gradient: string }> = {
  common: {
    label: "Common",
    color: "#94a3b8",
    gradient: "linear-gradient(135deg,#64748b,#94a3b8)",
  },
  rare: {
    label: "Rare",
    color: "#38bdf8",
    gradient: "linear-gradient(135deg,#0ea5e9,#38bdf8)",
  },
  epic: {
    label: "Epic",
    color: "#c084fc",
    gradient: "linear-gradient(135deg,#7c3aed,#c084fc)",
  },
  legendary: {
    label: "Legendary",
    color: "#fbbf24",
    gradient: "linear-gradient(135deg,#f59e0b,#fde68a)",
  },
};

type StatMetric = keyof HeroStats;

export type CatalogEntry = {
  code: string;
  name: string;
  description: string;
  icon: string;
  rarity: Rarity;
  /** Either a plain stat threshold… */
  metric?: StatMetric;
  target?: number;
  /** …or a building-completion rule (matches building name, case-insensitive). */
  buildingMatch?: string[];
  buildingPercent?: number;
};

export const ACHIEVEMENTS: CatalogEntry[] = [
  {
    code: "first_lesson",
    name: "First Lesson",
    description: "Complete your very first Quest",
    icon: "📖",
    rarity: "common",
    metric: "lessonsCompleted",
    target: 1,
  },
  {
    code: "first_dungeon",
    name: "First Dungeon Cleared",
    description: "Clear a full Dungeon from entrance to chest",
    icon: "🏰",
    rarity: "rare",
    metric: "dungeonsCleared",
    target: 1,
  },
  {
    code: "first_master_trial",
    name: "First Master Trial",
    description: "Defeat your first Guardian",
    icon: "👹",
    rarity: "rare",
    metric: "masterTrialsWon",
    target: 1,
  },
  {
    code: "first_month",
    name: "First Month",
    description: "Spend 30 days at Ingenious Academy",
    icon: "🗓️",
    rarity: "rare",
    metric: "daysInAcademy",
    target: 30,
  },
  {
    code: "math_explorer",
    name: "Mathematics Explorer",
    description: "Reach 50% in a Mathematics building",
    icon: "📐",
    rarity: "epic",
    buildingMatch: ["math", "algebra", "geometry"],
    buildingPercent: 50,
  },
  {
    code: "science_explorer",
    name: "Science Explorer",
    description: "Reach 50% in a Science building",
    icon: "🔬",
    rarity: "epic",
    buildingMatch: ["science", "physics", "chemistry", "biology"],
    buildingPercent: 50,
  },
  {
    code: "reading_champion",
    name: "Reading Champion",
    description: "Complete 25 Quests across the Academy",
    icon: "📚",
    rarity: "epic",
    metric: "lessonsCompleted",
    target: 25,
  },
];

export const BADGES: CatalogEntry[] = [
  {
    code: "perfect_attendance",
    name: "Perfect Attendance",
    description: "Keep attendance at 100%",
    icon: "🎯",
    rarity: "legendary",
    metric: "attendancePct",
    target: 100,
  },
  {
    code: "top_performer",
    name: "Top Performer",
    description: "Earn 2,000 lifetime XP",
    icon: "🏆",
    rarity: "epic",
    metric: "xpEarned",
    target: 2000,
  },
  {
    code: "weekly_champion",
    name: "Weekly Champion",
    description: "Hold a 7 day learning streak",
    icon: "🔥",
    rarity: "rare",
    metric: "maxStreak",
    target: 7,
  },
  {
    code: "mission_master",
    name: "Daily Mission Master",
    description: "Complete 25 Daily Missions",
    icon: "🎖️",
    rarity: "epic",
    metric: "missionsCompleted",
    target: 25,
  },
  {
    code: "math_master",
    name: "Mathematics Master",
    description: "Fully complete a Mathematics building",
    icon: "♾️",
    rarity: "legendary",
    buildingMatch: ["math", "algebra", "geometry"],
    buildingPercent: 100,
  },
  {
    code: "science_master",
    name: "Science Master",
    description: "Fully complete a Science building",
    icon: "⚗️",
    rarity: "legendary",
    buildingMatch: ["science", "physics", "chemistry", "biology"],
    buildingPercent: 100,
  },
];

export type EvaluatedEntry = CatalogEntry & {
  unlocked: boolean;
  progress: number;
  target: number;
  percent: number;
};

export function evaluateEntry(
  entry: CatalogEntry,
  stats: HeroStats,
  journey: HeroJourney,
): EvaluatedEntry {
  let progress = 0;
  let target = 1;

  if (entry.metric && typeof entry.target === "number") {
    progress = Number(stats[entry.metric] ?? 0);
    target = entry.target;
  } else if (entry.buildingMatch && entry.buildingPercent) {
    const match = journey.buildings.filter((b) =>
      entry.buildingMatch!.some((m) => b.name.toLowerCase().includes(m)),
    );
    progress = match.length ? Math.max(...match.map((b) => b.percent)) : 0;
    target = entry.buildingPercent;
  }

  const percent = target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0;
  return { ...entry, progress, target, percent, unlocked: progress >= target };
}

export function evaluateAll(
  entries: CatalogEntry[],
  stats: HeroStats,
  journey: HeroJourney,
): EvaluatedEntry[] {
  return entries.map((e) => evaluateEntry(e, stats, journey));
}
