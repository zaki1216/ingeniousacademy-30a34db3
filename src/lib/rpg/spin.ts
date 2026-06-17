// Daily Spin Wheel prize table (server-authoritative)
export type SpinRewardType = "coins" | "xp" | "key" | "badge" | "pass" | "shadow" | "pet";
export type SpinRarity = "common" | "rare" | "epic" | "legendary";

export type SpinPrize = {
  id: string;
  label: string;
  icon: string;
  type: SpinRewardType;
  value: string; // arbitrary code/value
  amount: number; // coin/xp amount, else 1
  rarity: SpinRarity;
  weight: number; // selection weight (higher = more common)
  color: string; // wheel slice color
};

export const SPIN_PRIZES: SpinPrize[] = [
  { id: "c100",  label: "100 Coins",     icon: "🪙", type: "coins", value: "coins",  amount: 100,  rarity: "common",    weight: 28, color: "#facc15" },
  { id: "x50",   label: "50 XP",         icon: "✨", type: "xp",    value: "xp",     amount: 50,   rarity: "common",    weight: 22, color: "#38bdf8" },
  { id: "c500",  label: "500 Coins",     icon: "💰", type: "coins", value: "coins",  amount: 500,  rarity: "rare",      weight: 14, color: "#f59e0b" },
  { id: "x200",  label: "200 XP",        icon: "🌟", type: "xp",    value: "xp",     amount: 200,  rarity: "rare",      weight: 12, color: "#0ea5e9" },
  { id: "key",   label: "Lucky Key",     icon: "🗝️", type: "key",   value: "lucky_key", amount: 1, rarity: "rare",      weight: 9,  color: "#a78bfa" },
  { id: "badge", label: "Spin Badge",    icon: "🏅", type: "badge", value: "spin_badge", amount: 1, rarity: "epic",     weight: 6,  color: "#22c55e" },
  { id: "pass",  label: "Streak Shield Pass", icon: "🛡️", type: "pass", value: "streak_shield", amount: 1, rarity: "epic", weight: 5, color: "#ef4444" },
  { id: "c2k",   label: "2,000 Coins",   icon: "💎", type: "coins", value: "coins",  amount: 2000, rarity: "epic",      weight: 3,  color: "#ec4899" },
  { id: "shadow",label: "Mystery Shadow",icon: "👤", type: "shadow",value: "mystery_shadow", amount: 1, rarity: "legendary", weight: 0.7, color: "#7c3aed" },
  { id: "pet",   label: "Mystery Pet",   icon: "🐾", type: "pet",   value: "mystery_pet", amount: 1, rarity: "legendary", weight: 0.3, color: "#f43f5e" },
];

export function pickWeighted(prizes: SpinPrize[] = SPIN_PRIZES): SpinPrize {
  const total = prizes.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of prizes) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return prizes[0];
}
