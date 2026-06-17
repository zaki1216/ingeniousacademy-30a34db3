// Academy Pass catalog — fixed list, lives in code (cosmetic + gameplay item shop).
// Persistence: every purchase creates a row in public.user_passes.

export type PassLimit = { kind: "weekly" | "monthly"; count: number } | { kind: "none" };

export type PassDef = {
  code: string;
  name: string;
  emoji: string;
  description: string;
  details: string;
  costCoins: number;
  durationHours?: number;          // for time-bounded passes (e.g. Double XP 24h)
  limit: PassLimit;
  requiresApproval: boolean;
  examBlocked?: boolean;           // cannot be used during exam windows
  rarity: "common" | "rare" | "epic" | "legendary";
  tint: string;                    // for card glow
};

export const PASSES: PassDef[] = [
  {
    code: "homework_shield",
    name: "Homework Shield",
    emoji: "🛡️",
    description: "Skip one homework assignment.",
    details: "Submit this pass to your teacher to be excused from one homework. Teacher approval required.",
    costCoins: 5000,
    limit: { kind: "weekly", count: 1 },
    requiresApproval: true,
    rarity: "epic",
    tint: "#22d3ee",
  },
  {
    code: "holiday_pass",
    name: "Holiday Pass",
    emoji: "🏖️",
    description: "One extra leave day, no attendance penalty.",
    details: "Spend a pre-approved leave day. Cannot be used during exam weeks. Teacher approval required.",
    costCoins: 10000,
    limit: { kind: "monthly", count: 1 },
    requiresApproval: true,
    examBlocked: true,
    rarity: "legendary",
    tint: "#fbbf24",
  },
  {
    code: "streak_shield",
    name: "Streak Shield",
    emoji: "🔥",
    description: "Protect your daily streak from one missed day.",
    details: "Auto-consumed the next time you miss a day. Keeps streak alive.",
    costCoins: 5000,
    limit: { kind: "none" },
    requiresApproval: false,
    rarity: "rare",
    tint: "#fb923c",
  },
  {
    code: "double_xp_potion",
    name: "Double XP Potion",
    emoji: "🧪",
    description: "Double XP gains for 24 hours.",
    details: "Activates immediately on purchase. Stacks with lecture and quiz XP.",
    costCoins: 3000,
    durationHours: 24,
    limit: { kind: "none" },
    requiresApproval: false,
    rarity: "rare",
    tint: "#a855f7",
  },
  {
    code: "quiz_retry_token",
    name: "Quiz Retry Token",
    emoji: "🎟️",
    description: "Retake one quiz to improve your score.",
    details: "Apply to any completed quiz to unlock a fresh attempt. Best score wins.",
    costCoins: 4000,
    limit: { kind: "none" },
    requiresApproval: false,
    rarity: "rare",
    tint: "#38bdf8",
  },
  {
    code: "secret_mission_ticket",
    name: "Secret Mission Ticket",
    emoji: "🗝️",
    description: "Unlock a hidden mission with bonus rewards.",
    details: "Reveals a one-time mission tailored to your level.",
    costCoins: 7000,
    limit: { kind: "none" },
    requiresApproval: false,
    rarity: "epic",
    tint: "#ec4899",
  },
  {
    code: "lucky_chest_key",
    name: "Lucky Chest Key",
    emoji: "🗝️",
    description: "Open a mystery reward chest.",
    details: "Random rewards: coins, XP, or a rare cosmetic.",
    costCoins: 6000,
    limit: { kind: "none" },
    requiresApproval: false,
    rarity: "epic",
    tint: "#facc15",
  },
];

export function getPass(code: string): PassDef | undefined {
  return PASSES.find((p) => p.code === code);
}

export function rarityHex(r: PassDef["rarity"]): string {
  switch (r) {
    case "common": return "#94a3b8";
    case "rare": return "#38bdf8";
    case "epic": return "#a855f7";
    case "legendary": return "#f59e0b";
  }
}
