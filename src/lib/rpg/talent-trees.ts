// Maps existing talent codes into 4 subject-themed skill trees.
// Each tier of a talent becomes a node along the tree's path.
// Purely presentational — talent codes/effects are unchanged server-side.

export type TreeKey = "math" | "science" | "language" | "reasoning";

export type SkillTreeMeta = {
  key: TreeKey;
  name: string;
  tagline: string;
  sigil: string; // emoji glyph
  accent: string; // tailwind gradient e.g. "from-amber-400 to-orange-600"
  ring: string; // tailwind ring/border color e.g. "ring-amber-400/40"
  shadow: string; // glow color hex for box-shadow
  // Talent code from src/lib/gamification/talents.ts that anchors this tree
  talentCode: string;
  // Per-tier node labels (length should match talent.maxTier)
  nodeLabels: string[];
};

export const SKILL_TREES: SkillTreeMeta[] = [
  {
    key: "math",
    name: "Mathematics Tree",
    tagline: "Numbers bend to your will. Treasure follows.",
    sigil: "∑",
    accent: "from-amber-400 via-orange-500 to-rose-600",
    ring: "ring-amber-400/40",
    shadow: "rgba(251,191,36,0.45)",
    talentCode: "coin_multiplier",
    nodeLabels: [
      "Arithmetic Initiate",
      "Algebra Adept",
      "Geometry Sage",
      "Calculus Conjurer",
      "Number Monarch",
    ],
  },
  {
    key: "science",
    name: "Science Tree",
    tagline: "Curiosity charged. Every lesson grants wisdom.",
    sigil: "⚛",
    accent: "from-violet-500 via-fuchsia-500 to-indigo-600",
    ring: "ring-violet-400/40",
    shadow: "rgba(167,139,250,0.55)",
    talentCode: "xp_boost",
    nodeLabels: [
      "Atom Apprentice",
      "Catalyst",
      "Aether Seeker",
      "Quantum Adept",
      "Cosmos Archon",
    ],
  },
  {
    key: "language",
    name: "Language Tree",
    tagline: "Whispers reveal the path. Hints answer your call.",
    sigil: "✦",
    accent: "from-emerald-400 via-teal-500 to-cyan-600",
    ring: "ring-emerald-400/40",
    shadow: "rgba(52,211,153,0.5)",
    talentCode: "hint_orb",
    nodeLabels: ["Rune Reader", "Verse Weaver", "Tongue of Oracles"],
  },
  {
    key: "reasoning",
    name: "Reasoning Tree",
    tagline: "Forged discipline. The streak cannot break you.",
    sigil: "◈",
    accent: "from-sky-400 via-blue-500 to-indigo-600",
    ring: "ring-sky-400/40",
    shadow: "rgba(56,189,248,0.5)",
    talentCode: "streak_shield",
    nodeLabels: ["Logic Trainee", "Pattern Hunter", "Mindforger"],
  },
];
