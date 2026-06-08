// Level progression: XP needed to GO from level L to L+1 = 100 * L.
// Total XP required to REACH level L = 50 * L * (L - 1).
export const MAX_LEVEL = 100;

export function totalXpForLevel(level: number): number {
  const l = Math.max(1, Math.min(MAX_LEVEL, level));
  return 50 * l * (l - 1);
}

export function levelFromXp(xp: number): number {
  // largest L such that totalXpForLevel(L) <= xp
  for (let l = MAX_LEVEL; l >= 1; l--) {
    if (xp >= totalXpForLevel(l)) return l;
  }
  return 1;
}

export function levelProgress(xp: number): {
  level: number;
  currentLevelXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPct: number;
} {
  const level = levelFromXp(xp);
  const currentLevelXp = totalXpForLevel(level);
  const nextLevelXp = totalXpForLevel(Math.min(MAX_LEVEL, level + 1));
  const span = Math.max(1, nextLevelXp - currentLevelXp);
  const xpIntoLevel = xp - currentLevelXp;
  return {
    level,
    currentLevelXp,
    xpIntoLevel,
    xpForNextLevel: nextLevelXp - currentLevelXp,
    progressPct: level >= MAX_LEVEL ? 100 : Math.min(100, Math.round((xpIntoLevel / span) * 100)),
  };
}
