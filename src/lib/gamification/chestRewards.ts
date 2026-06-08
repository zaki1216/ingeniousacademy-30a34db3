// Daily chest reward table. Coins per day in a 30-day cycle.
export type ChestReward = {
  day: number;
  coins: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  label: string;
};

export const CHEST_CYCLE_DAYS = 30;

export function chestRewardForDay(day: number): ChestReward {
  const d = ((day - 1) % CHEST_CYCLE_DAYS) + 1;
  if (d === 30) return { day: d, coins: 1000, rarity: "legendary", label: "Legendary Chest" };
  if (d === 14 || d === 21) return { day: d, coins: 300, rarity: "epic", label: "Epic Chest" };
  if (d === 7) return { day: d, coins: 200, rarity: "epic", label: "Epic Chest" };
  if (d % 5 === 0) return { day: d, coins: 100, rarity: "rare", label: "Rare Chest" };
  // Days 1..6: 20, 30, 40, 50, 60, 75
  const base = [20, 30, 40, 50, 60, 75];
  if (d <= 6) return { day: d, coins: base[d - 1], rarity: "common", label: "Daily Chest" };
  // Days 8-13, 16-20, 22-29 — small ramp
  return { day: d, coins: 50 + (d % 4) * 10, rarity: "common", label: "Daily Chest" };
}

export function nextChestPreview(currentDay: number): ChestReward[] {
  const list: ChestReward[] = [];
  const start = Math.max(1, currentDay + 1);
  for (let i = 0; i < 7; i++) list.push(chestRewardForDay(start + i));
  return list;
}
