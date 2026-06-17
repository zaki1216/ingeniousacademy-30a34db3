// Solo Leveling style rank tiers, derived from existing data.
// We DO NOT change the leaderboard calculation — we only translate
// a score (or class percentile) into a visual tier.

export type RankTier =
  | "E"
  | "D"
  | "C"
  | "B"
  | "A"
  | "S"
  | "NATIONAL"
  | "MONARCH";

export type RankInfo = {
  tier: RankTier;
  label: string;
  shortLabel: string;
  color: string; // CSS var-friendly color
  gradient: string;
  glow: string;
  description: string;
};

export const RANK_TIERS: RankInfo[] = [
  {
    tier: "E",
    label: "E-Rank Hunter",
    shortLabel: "E",
    color: "#94a3b8",
    gradient: "linear-gradient(135deg,#475569,#94a3b8)",
    glow: "#94a3b8",
    description: "Awakening",
  },
  {
    tier: "D",
    label: "D-Rank Hunter",
    shortLabel: "D",
    color: "#22d3ee",
    gradient: "linear-gradient(135deg,#0891b2,#22d3ee)",
    glow: "#22d3ee",
    description: "Rising",
  },
  {
    tier: "C",
    label: "C-Rank Hunter",
    shortLabel: "C",
    color: "#34d399",
    gradient: "linear-gradient(135deg,#059669,#34d399)",
    glow: "#34d399",
    description: "Steady Climber",
  },
  {
    tier: "B",
    label: "B-Rank Hunter",
    shortLabel: "B",
    color: "#a78bfa",
    gradient: "linear-gradient(135deg,#6d4cff,#a78bfa)",
    glow: "#a78bfa",
    description: "Shadow Aware",
  },
  {
    tier: "A",
    label: "A-Rank Hunter",
    shortLabel: "A",
    color: "#fb7185",
    gradient: "linear-gradient(135deg,#e11d48,#fb7185)",
    glow: "#fb7185",
    description: "Elite",
  },
  {
    tier: "S",
    label: "S-Rank Hunter",
    shortLabel: "S",
    color: "#fbbf24",
    gradient: "linear-gradient(135deg,#f59e0b,#fbbf24,#fde68a)",
    glow: "#fbbf24",
    description: "Apex Hunter",
  },
  {
    tier: "NATIONAL",
    label: "National Rank",
    shortLabel: "NAT",
    color: "#f0abfc",
    gradient: "linear-gradient(135deg,#a21caf,#f0abfc,#22d3ee)",
    glow: "#f0abfc",
    description: "Legend of the Nation",
  },
  {
    tier: "MONARCH",
    label: "Monarch",
    shortLabel: "♛",
    color: "#fbbf24",
    gradient:
      "linear-gradient(135deg,#6d4cff 0%,#a855f7 35%,#fbbf24 65%,#ff3b6b 100%)",
    glow: "#a855f7",
    description: "Sovereign of Knowledge",
  },
];

const RANK_BY_TIER: Record<RankTier, RankInfo> = Object.fromEntries(
  RANK_TIERS.map((r) => [r.tier, r]),
) as Record<RankTier, RankInfo>;

export function rankByTier(tier: RankTier): RankInfo {
  return RANK_BY_TIER[tier];
}

/**
 * Derive a rank tier from the player's level.
 * Level brackets are tuned to feel rewarding while staying within
 * the existing 1..100 leveling system.
 */
export function rankFromLevel(level: number): RankInfo {
  if (level >= 75) return RANK_BY_TIER.MONARCH;
  if (level >= 55) return RANK_BY_TIER.NATIONAL;
  if (level >= 40) return RANK_BY_TIER.S;
  if (level >= 28) return RANK_BY_TIER.A;
  if (level >= 18) return RANK_BY_TIER.B;
  if (level >= 10) return RANK_BY_TIER.C;
  if (level >= 5) return RANK_BY_TIER.D;
  return RANK_BY_TIER.E;
}

export function nextRank(level: number): { next: RankInfo | null; levelsAway: number } {
  const thresholds: { lv: number; t: RankTier }[] = [
    { lv: 5, t: "D" },
    { lv: 10, t: "C" },
    { lv: 18, t: "B" },
    { lv: 28, t: "A" },
    { lv: 40, t: "S" },
    { lv: 55, t: "NATIONAL" },
    { lv: 75, t: "MONARCH" },
  ];
  for (const th of thresholds) {
    if (level < th.lv) {
      return { next: RANK_BY_TIER[th.t], levelsAway: th.lv - level };
    }
  }
  return { next: null, levelsAway: 0 };
}
