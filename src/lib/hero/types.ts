/**
 * Academy Hero Profile — shared types.
 *
 * The Hero Profile is a *read-only projection* over existing systems
 * (XP, Coins, Attendance, Guardian/Chapter completions, Academy Ranks,
 * Daily Missions and the Curriculum Engine). It never writes and never
 * changes the academic data model.
 *
 * Everything is intentionally shaped so future personalisation systems
 * (Avatar Equipment, Marketplace, Dorm Preview, Seasonal Frames,
 * Certificates, Graduation) can be layered on without refactors:
 *   - `showcase` carries optional slots that are simply empty today.
 *   - achievements/badges are derived from a config catalog, so new
 *     entries only require editing `src/lib/hero/catalog.ts`.
 */

export type HeroIdentity = {
  name: string;
  username: string | null;
  avatar: string | null;
  frame: string | null;
  title: string | null;
  standardName: string | null;
  joinedAt: string | null;
};

export type HeroStats = {
  xp: number;
  level: number;
  coins: number;
  lessonsCompleted: number;
  dungeonsCleared: number;
  masterTrialsWon: number;
  missionsCompleted: number;
  studyMinutes: number;
  streakDays: number;
  maxStreak: number;
  attendancePct: number;
  attendanceDays: number;
  xpEarned: number;
  coinsEarned: number;
  rankPromotions: number;
  daysInAcademy: number;
};

export type HeroBuildingProgress = {
  id: string;
  name: string;
  total: number;
  done: number;
  percent: number;
};

export type HeroJourney = {
  overallPercent: number;
  overallDone: number;
  overallTotal: number;
  buildings: HeroBuildingProgress[];
};

export type HeroTimelineEvent = {
  id: string;
  icon: string;
  title: string;
  detail: string | null;
  at: string;
  kind: "join" | "rank" | "dungeon" | "quest" | "chest" | "mission";
};

/** Future-ready personalisation slots. Populated by later systems. */
export type HeroShowcase = {
  avatar: string | null;
  frame: string | null;
  title: string | null;
  companion: string | null;
  dorm: string | null;
  favoriteBadge: string | null;
};

export type HeroProfileResult = {
  identity: HeroIdentity;
  stats: HeroStats;
  journey: HeroJourney;
  timeline: HeroTimelineEvent[];
  showcase: HeroShowcase;
};
