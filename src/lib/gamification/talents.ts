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
  icon: string;
  color: string;
  maxTier: number;
  costPerTier: number[];
  effect: TalentEffect;
  requires?: { code: string; tier: number };
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

export function totalTalentPoints(level: number): number {
  return Math.floor(level / 5);
}

export function costForNextTier(t: Talent, currentTier: number): number | null {
  if (currentTier >= t.maxTier) return null;
  return t.costPerTier[currentTier];
}

export function getMultipliers(
  unlocked: Record<string, number>,
  perTierOverrides?: Record<string, number>,
) {
  const xpPer = perTierOverrides?.xp_boost ?? 0.05;
  const coinPer = perTierOverrides?.coin_multiplier ?? 0.05;
  const shieldPer = perTierOverrides?.streak_shield ?? 1;
  const hintPer = perTierOverrides?.hint_orb ?? 1;
  return {
    xpMult: 1 + (unlocked["xp_boost"] ?? 0) * xpPer,
    coinMult: 1 + (unlocked["coin_multiplier"] ?? 0) * coinPer,
    streakShield: Math.round((unlocked["streak_shield"] ?? 0) * shieldPer),
    hintOrbs: Math.round((unlocked["hint_orb"] ?? 0) * hintPer),
  };
}

// Build the effective catalog by layering DB overrides on top of defaults.
export function applyOverrides(
  overrides: Array<{
    talent_code: string;
    max_tier: number;
    cost_per_tier: number[];
    per_tier_value: number | string;
  }>,
): Talent[] {
  const map = new Map(overrides.map((o) => [o.talent_code, o]));
  return TALENTS.map((t) => {
    const o = map.get(t.code);
    if (!o) return t;
    const per = Number(o.per_tier_value);
    const effect: TalentEffect =
      t.effect.kind === "xp_multiplier"
        ? { kind: "xp_multiplier", perTier: per }
        : t.effect.kind === "coin_multiplier"
        ? { kind: "coin_multiplier", perTier: per }
        : t.effect.kind === "streak_shield"
        ? { kind: "streak_shield", perTier: per }
        : { kind: "hint_orb", perTier: per };
    return {
      ...t,
      maxTier: o.max_tier,
      costPerTier: o.cost_per_tier,
      effect,
    };
  });
}
