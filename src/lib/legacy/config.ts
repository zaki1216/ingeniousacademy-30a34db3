/**
 * Academy Legacy System — shared configuration & types.
 *
 * The Legacy layer is *recognition only*: it never grants XP, coins or
 * academic access. Everything here is configuration so future expansions
 * (annual ceremonies, alumni, year-wise halls, event awards, national
 * certificates) only need new entries, not architecture changes.
 */

export type LegacyKind =
  | "join"
  | "quest"
  | "dungeon"
  | "trial"
  | "rank"
  | "marketplace"
  | "achievement"
  | "graduation"
  | "title"
  | "award"
  | "dorm";

export type LegacyEvent = {
  id: string;
  kind: LegacyKind;
  code: string;
  icon: string;
  title: string;
  detail: string | null;
  occurred_at: string;
};

export type LegacyCertificate = {
  id: string;
  subject_id: string | null;
  subject_name: string;
  standard_name: string | null;
  student_name: string;
  username: string | null;
  rank_name: string | null;
  serial: string;
  issued_at: string;
};

export type LegacyTitle = {
  code: string;
  name: string;
  description: string | null;
  icon: string;
  rarity: string;
  unlocked: boolean;
  equipped: boolean;
  unlocked_at: string | null;
  requirement: string | null;
};

export type LegacySettings = {
  headmaster_name: string;
  headmaster_signature: string;
  seal_text: string;
  graduation_threshold: number;
  celebrations_enabled: boolean;
  ceremony_enabled: boolean;
  hall_categories: string[];
  certificate_note: string;
};

export type LegacyHallEntry = {
  id: string;
  category: string;
  icon: string;
  name: string;
  detail: string | null;
};

export type LegacySummary = {
  graduations: number;
  dungeons: number;
  masterTrials: number;
  promotions: number;
  purchases: number;
  achievements: number;
  awards: number;
  certificates: number;
  titles: number;
};

export type LegacyState = {
  settings: LegacySettings;
  events: LegacyEvent[];
  certificates: LegacyCertificate[];
  titles: LegacyTitle[];
  hall: LegacyHallEntry[];
  summary: LegacySummary;
  /** Codes created during this sync — the UI celebrates these once. */
  fresh: string[];
};

export const LEGACY_KIND_STYLE: Record<string, { label: string; color: string }> = {
  join: { label: "Enrolment", color: "#94a3b8" },
  quest: { label: "Quest", color: "#38bdf8" },
  dungeon: { label: "Dungeon", color: "#a78bfa" },
  trial: { label: "Master Trial", color: "#f472b6" },
  rank: { label: "Promotion", color: "#fbbf24" },
  marketplace: { label: "Marketplace", color: "#34d399" },
  achievement: { label: "Achievement", color: "#c084fc" },
  graduation: { label: "Graduation", color: "#fde68a" },
  title: { label: "Title", color: "#f59e0b" },
  award: { label: "Academy Award", color: "#fb7185" },
  dorm: { label: "My Academy", color: "#f9a8d4" },
};

export const HALL_CATEGORIES: { code: string; label: string; icon: string }[] = [
  { code: "certificates", label: "Graduation Certificates", icon: "🎓" },
  { code: "titles", label: "Master Titles", icon: "🎖️" },
  { code: "badges", label: "Rare Badges", icon: "🏵️" },
  { code: "trophies", label: "Major Trophies", icon: "🏆" },
  { code: "awards", label: "Academy Awards", icon: "🌟" },
];

/** Quest-count milestones that become permanent legacy entries. */
export const QUEST_MILESTONES = [1, 10, 25, 50, 100, 250];

/** Marketplace purchase milestones. */
export const PURCHASE_MILESTONES = [1, 5, 15];

/** Celebration copy for freshly unlocked legacy codes. */
export function celebrationFor(code: string, title: string): { icon: string; line: string } {
  if (code === "quest_1") return { icon: "📖", line: "Your very first Quest is now part of your Academy story." };
  if (code.startsWith("graduation_")) return { icon: "🎓", line: "A subject graduation has been recorded forever." };
  if (code.startsWith("rank_")) return { icon: "🏅", line: "A new Academy Rank joins your legacy." };
  if (code.startsWith("dungeon_")) return { icon: "🏰", line: "Another Dungeon cleared and remembered." };
  if (code.startsWith("purchase_")) return { icon: "🛍️", line: "Your Marketplace journey has begun." };
  if (code.startsWith("title_")) return { icon: "🎖️", line: "A new Academy Title is yours to wear." };
  return { icon: "⭐", line: `${title} has been added to your Academy Legacy.` };
}
