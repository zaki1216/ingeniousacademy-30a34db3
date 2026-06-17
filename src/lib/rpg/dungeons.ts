// Helpers that translate raw chapter/subject data into "dungeon" presentation
// metadata. Pure functions — no DB writes, no schema changes.

import { rankFromLevel } from "./ranks";

export type DungeonDifficulty = "Trivial" | "Normal" | "Hard" | "Elite" | "Nightmare";

export type ShadowStatus = {
  /** True when the shadow is currently available to be awakened by the player. */
  unlocked: boolean;
  /** Short label e.g. "Dungeon Shadow". */
  name: string;
  /** Plain-English unlock requirement, always present so cards can show progress. */
  requirement: string;
  /** Progress toward unlock 0–1, useful for progress bars on the card. */
  progress: number;
};

export type DungeonMeta = {
  name: string;            // "Algebra Dungeon", "Geometry Fortress"
  suffix: string;          // "Dungeon" | "Fortress" | ...
  emoji: string;
  difficulty: DungeonDifficulty;
  recommendedLevel: number;
  rewardXp: number;
  rewardCoins: number;
  bossAvailable: boolean;
  shadow: ShadowStatus;
};

const SUFFIX_POOL: { keys: string[]; suffix: string; emoji: string }[] = [
  { keys: ["algebra", "equation"], suffix: "Dungeon", emoji: "🧮" },
  { keys: ["geometry", "triangle", "circle"], suffix: "Fortress", emoji: "🏯" },
  { keys: ["trigonom"], suffix: "Spire", emoji: "🗼" },
  { keys: ["arithmetic", "number"], suffix: "Vault", emoji: "🔢" },
  { keys: ["statistic", "probab"], suffix: "Crypt", emoji: "📊" },
  { keys: ["force", "motion", "mechanic", "newton"], suffix: "Arena", emoji: "⚙️" },
  { keys: ["electric", "current", "magnet"], suffix: "Citadel", emoji: "⚡" },
  { keys: ["light", "optic", "wave", "sound"], suffix: "Prism", emoji: "🌈" },
  { keys: ["acid", "base", "salt", "metal", "chemic", "react"], suffix: "Lab", emoji: "🧪" },
  { keys: ["carbon", "organic"], suffix: "Forge", emoji: "🧬" },
  { keys: ["cell", "tissue", "life"], suffix: "Grove", emoji: "🌿" },
  { keys: ["plant", "photosynth", "crop"], suffix: "Garden", emoji: "🌱" },
  { keys: ["animal", "human", "body", "circul", "respir"], suffix: "Sanctum", emoji: "🫀" },
  { keys: ["history", "ancient", "empire", "civil"], suffix: "Ruins", emoji: "🏛️" },
  { keys: ["geograph", "earth", "soil", "climate"], suffix: "Wilds", emoji: "🌍" },
  { keys: ["civic", "polit", "constitut"], suffix: "Senate", emoji: "⚖️" },
  { keys: ["econom", "money", "trade"], suffix: "Bazaar", emoji: "💰" },
  { keys: ["grammar", "tense", "verb"], suffix: "Scriptorium", emoji: "📜" },
  { keys: ["poem", "poetry", "literat", "story"], suffix: "Library", emoji: "📚" },
];

const DEFAULT_SUFFIXES = ["Dungeon", "Sanctum", "Vault", "Citadel", "Hollow", "Spire"];

export function dungeonMeta(
  chapterName: string,
  chapterNumber: number,
  totalLectures: number,
  watchedLectures: number,
  playerLevel: number,
): DungeonMeta {
  const lc = chapterName.toLowerCase();
  const match = SUFFIX_POOL.find((p) => p.keys.some((k) => lc.includes(k)));
  const suffix = match?.suffix ?? DEFAULT_SUFFIXES[chapterNumber % DEFAULT_SUFFIXES.length];
  const emoji = match?.emoji ?? "🗝️";

  const name = `${chapterName} ${suffix}`;

  // Difficulty scales with chapter number — later chapters feel harder.
  let difficulty: DungeonDifficulty = "Normal";
  if (chapterNumber <= 2) difficulty = "Trivial";
  else if (chapterNumber <= 5) difficulty = "Normal";
  else if (chapterNumber <= 9) difficulty = "Hard";
  else if (chapterNumber <= 14) difficulty = "Elite";
  else difficulty = "Nightmare";

  const recommendedLevel = Math.max(1, chapterNumber * 2);
  const rewardXp = 50 + chapterNumber * 25;
  const rewardCoins = 10 + chapterNumber * 5;
  const bossAvailable = totalLectures > 0 && watchedLectures >= Math.max(1, totalLectures - 1);

  const rank = rankFromLevel(playerLevel);
  const eligible = chapterNumber >= 6 && totalLectures > 0;
  const allCleared = totalLectures > 0 && watchedLectures >= totalLectures;
  const unlocked = eligible && allCleared;
  const shadow: ShadowStatus = {
    unlocked,
    name: `${suffix} Shadow`,
    requirement: !eligible
      ? `Reach a Tier-${chapterNumber >= 6 ? "" : "6+ "}dungeon to attempt the shadow`
      : unlocked
        ? `Awakened — bind this shadow as ${rank.shortLabel}+`
        : `Clear all ${totalLectures} missions to awaken (${watchedLectures}/${totalLectures})`,
    progress: totalLectures > 0 ? Math.min(1, watchedLectures / totalLectures) : 0,
  };

  return {
    name,
    suffix,
    emoji,
    difficulty,
    recommendedLevel,
    rewardXp,
    rewardCoins,
    bossAvailable,
    shadow,
  };
}

export const DIFFICULTY_TONE: Record<DungeonDifficulty, { color: string; bg: string }> = {
  Trivial:   { color: "#94a3b8", bg: "rgba(148,163,184,0.15)" },
  Normal:    { color: "#22d3ee", bg: "rgba(34,211,238,0.15)" },
  Hard:      { color: "#a78bfa", bg: "rgba(167,139,250,0.18)" },
  Elite:     { color: "#fb7185", bg: "rgba(251,113,133,0.18)" },
  Nightmare: { color: "#fbbf24", bg: "rgba(251,191,36,0.18)" },
};
