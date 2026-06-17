// Cosmetic-only pet system. Stored in localStorage so it ships without DB changes.
// Future: persist `equipped_pet` / `owned_pets` on profiles to sync server-side.

export type PetRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export type Pet = {
  id: string;
  name: string;
  emoji: string;
  subject: "Math" | "Science" | "Language" | "Reasoning" | "Universal";
  rarity: PetRarity;
  description: string;
  flavor: string;
  gradient: string;
  glow: string;
  unlockHint: string;
  // Cosmetic-only: unlocked = true means it's available in the collection.
  // First two are unlocked by default so students always have something to equip.
  unlockedByDefault?: boolean;
};

export const PETS: Pet[] = [
  {
    id: "study_dragon",
    name: "Study Dragon",
    emoji: "🐉",
    subject: "Universal",
    rarity: "legendary",
    description: "Hoards knowledge like gold.",
    flavor: "Breathes focus, not fire.",
    gradient: "linear-gradient(135deg,#7c3aed,#22d3ee)",
    glow: "rgba(124,58,237,0.55)",
    unlockHint: "Reach Level 25",
    unlockedByDefault: true,
  },
  {
    id: "quiz_owl",
    name: "Quiz Owl",
    emoji: "🦉",
    subject: "Universal",
    rarity: "rare",
    description: "Hoots right answers in your ear.",
    flavor: "Nocturnal study buddy.",
    gradient: "linear-gradient(135deg,#6366f1,#a855f7)",
    glow: "rgba(99,102,241,0.5)",
    unlockHint: "Complete 10 quizzes",
    unlockedByDefault: true,
  },
  {
    id: "math_fox",
    name: "Math Fox",
    emoji: "🦊",
    subject: "Math",
    rarity: "epic",
    description: "Solves equations with a sly grin.",
    flavor: "Counts in primes.",
    gradient: "linear-gradient(135deg,#fb923c,#f43f5e)",
    glow: "rgba(251,146,60,0.55)",
    unlockHint: "Forge a Mathematics tier",
  },
  {
    id: "science_phoenix",
    name: "Science Phoenix",
    emoji: "🔥",
    subject: "Science",
    rarity: "mythic",
    description: "Reborn from every failed experiment.",
    flavor: "Combustion is just enthusiasm.",
    gradient: "linear-gradient(135deg,#f59e0b,#ef4444,#7c2d12)",
    glow: "rgba(239,68,68,0.6)",
    unlockHint: "Forge a Science tier",
  },
  {
    id: "language_tiger",
    name: "Language Tiger",
    emoji: "🐯",
    subject: "Language",
    rarity: "epic",
    description: "Roars in seven tongues.",
    flavor: "Stripes spell sentences.",
    gradient: "linear-gradient(135deg,#f97316,#facc15)",
    glow: "rgba(249,115,22,0.55)",
    unlockHint: "Forge a Language tier",
  },
  {
    id: "reason_wolf",
    name: "Reason Wolf",
    emoji: "🐺",
    subject: "Reasoning",
    rarity: "epic",
    description: "Hunts logical fallacies in packs.",
    flavor: "Howls in syllogisms.",
    gradient: "linear-gradient(135deg,#64748b,#0ea5e9)",
    glow: "rgba(14,165,233,0.5)",
    unlockHint: "Forge a Reasoning tier",
  },
  {
    id: "rune_cat",
    name: "Rune Cat",
    emoji: "🐱",
    subject: "Universal",
    rarity: "common",
    description: "Purrs softly during deep focus.",
    flavor: "Eight lives, all studying.",
    gradient: "linear-gradient(135deg,#a78bfa,#f0abfc)",
    glow: "rgba(167,139,250,0.45)",
    unlockHint: "Win 1 arena match",
  },
  {
    id: "void_octopus",
    name: "Void Octopus",
    emoji: "🐙",
    subject: "Universal",
    rarity: "mythic",
    description: "Eight arms, eight notebooks.",
    flavor: "Multitasks across dimensions.",
    gradient: "linear-gradient(135deg,#1e1b4b,#7c3aed,#ec4899)",
    glow: "rgba(236,72,153,0.55)",
    unlockHint: "Reach Monarch rank",
  },
];

const STORAGE_EQUIPPED = "rpg.pet.equipped";
const STORAGE_OWNED = "rpg.pet.owned";

export function rarityColor(r: PetRarity): string {
  switch (r) {
    case "common": return "#94a3b8";
    case "rare": return "#38bdf8";
    case "epic": return "#a855f7";
    case "legendary": return "#f59e0b";
    case "mythic": return "#ec4899";
  }
}

export function getEquippedPetId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_EQUIPPED);
}

export function setEquippedPetId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(STORAGE_EQUIPPED, id);
  else localStorage.removeItem(STORAGE_EQUIPPED);
  window.dispatchEvent(new Event("pet:changed"));
}

export function getOwnedPetIds(): string[] {
  if (typeof window === "undefined") return [];
  const defaults = PETS.filter((p) => p.unlockedByDefault).map((p) => p.id);
  try {
    const raw = localStorage.getItem(STORAGE_OWNED);
    const stored = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.from(new Set([...defaults, ...stored]));
  } catch {
    return defaults;
  }
}

export function unlockPet(id: string) {
  if (typeof window === "undefined") return;
  const owned = getOwnedPetIds();
  if (owned.includes(id)) return;
  localStorage.setItem(STORAGE_OWNED, JSON.stringify([...owned, id]));
  window.dispatchEvent(new Event("pet:changed"));
}

export function getPet(id: string | null): Pet | null {
  if (!id) return null;
  return PETS.find((p) => p.id === id) ?? null;
}
