// Skill tree catalog. Talent points are earned 1 per 5 levels.
// Effects are applied server-side in gamification.functions.ts and chest.functions.ts.

export type TalentEffect =
  | { kind: "xp_multiplier"; perTier: number }       // +n% xp per unlocked tier
  | { kind: "coin_multiplier"; perTier: number }     // +n% coins per unlocked tier
  | { kind: "streak_shield"; perTier: number }       // +n missed-day grace per tier
  | { kind: "hint_orb"; perTier: number };           // +n hints per quiz per tier

export type Talent = {
  code: string;
  name: string;
  description: string;
  icon: string;        // emoji for now
  color: string;       // tailwind gradient e.g. "from-amber-400 to-orange-500"
  maxTier: number;
  costPerTier: number[]; // length == maxTier
  effect: TalentEffect;
  requires?: { code: string; tier: number }; // optional prerequisite
};

export const TALENTS: Talent[] = [
  {
    code: "coin_multiplier",
    name: "Treasure Hunter",
    description: "Earn more coins from every quest and battle.",
    icon: "💰",
    color: "from-amber-400 to-yellow-600",
    maxTier: 5,
    costPerTier: [1, 1, 2, 2, 3],
    effect: { kind: "coin_multiplier", perTier: 0.05 },
  },
  {
    code: "xp_boost",
    name: "Wisdom Aura",
    description: "Gain bonus XP from every learning activity.",
    icon: "✨",
    color: "from-violet-500 to-fuchsia-600",
    maxTier: 5,
    costPerTier: [1, 1, 2, 2, 3],
    effect: { kind: "xp_multiplier", perTier: 0.05 },
  },
  {
    code: "streak_shield",
    name: "Streak Shield",
    description: "Forgive missed days so your streak survives.",
    icon: "🛡️",
    color: "from-sky-400 to-blue-600",
    maxTier: 3,
    costPerTier: [2, 3, 4],
    effect: { kind: "streak_shield", perTier: 1 },
  },
  {
    code: "hint_orb",
    name: "Hint Orb",
    description: "Reveal mystic hints during quizzes and battles.",
    icon: "🔮",
    color: "from-emerald-400 to-teal-600",
    maxTier: 3,
    costPerTier: [1, 2, 3],
    effect: { kind: "hint_orb", perTier: 1 },
  },
];

export function talentByCode(code: string): Talent | undefined {
  return TALENTS.find((t) => t.code === code);
}

// Total talent points earned: 1 per 5 levels (level 5 → 1, level 10 → 2, ...).
export function totalTalentPoints(level: number): number {
  return Math.floor(level / 5);
}

export function costForNextTier(t: Talent, currentTier: number): number | null {
  if (currentTier >= t.maxTier) return null;
  return t.costPerTier[currentTier]; // currentTier is 0-indexed into next tier cost
}

// Compute multipliers/grace given an unlocked map { code: tier }.
export function getMultipliers(unlocked: Record<string, number>) {
  const xpMult =
    1 + (unlocked["xp_boost"] ?? 0) * 0.05;
  const coinMult =
    1 + (unlocked["coin_multiplier"] ?? 0) * 0.05;
  const streakShield = unlocked["streak_shield"] ?? 0;
  const hintOrbs = unlocked["hint_orb"] ?? 0;
  return { xpMult, coinMult, streakShield, hintOrbs };
}
