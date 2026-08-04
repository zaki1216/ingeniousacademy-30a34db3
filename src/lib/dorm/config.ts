/**
 * My Academy — Dorm Room configuration.
 *
 * The dorm is entirely configuration-driven: room slots, the decoration
 * category each slot accepts and where the hotspot sits in the room are all
 * declared here. Adding a new slot (pet bed, certificate wall, seasonal
 * banner, Lumi corner…) or a new decoration category only requires editing
 * this file — no UI or server changes.
 *
 * Decorations themselves are ordinary Marketplace items living in
 * `shop_items` under the `dorm_decor` shop, so the existing Marketplace
 * purchase/inventory flow is reused untouched.
 */

export const DORM_SHOP_CODE = "dorm_decor";

export type DormCategory = {
  /** Matches `shop_items.type`. */
  code: string;
  label: string;
  icon: string;
};

export const DORM_CATEGORIES: DormCategory[] = [
  { code: "dorm_desk", label: "Study Tables", icon: "🪑" },
  { code: "dorm_chair", label: "Chairs", icon: "💺" },
  { code: "dorm_shelf", label: "Bookshelves", icon: "📚" },
  { code: "dorm_bed", label: "Beds", icon: "🛏️" },
  { code: "dorm_plant", label: "Plants", icon: "🪴" },
  { code: "dorm_rug", label: "Rugs", icon: "🧶" },
  { code: "dorm_poster", label: "Wall Posters", icon: "🖼️" },
  { code: "dorm_lamp", label: "Lamps", icon: "🕯️" },
  { code: "dorm_trophy", label: "Trophies", icon: "🏆" },
  { code: "dorm_flag", label: "Academy Flags", icon: "🚩" },
  { code: "dorm_window", label: "Window Themes", icon: "🪟" },
];

export const DORM_CATEGORY_BY_CODE = new Map(DORM_CATEGORIES.map((c) => [c.code, c]));

export function isDormType(type: string): boolean {
  return DORM_CATEGORY_BY_CODE.has(type);
}

export type DormSlot = {
  id: string;
  label: string;
  /** Decoration category (shop_items.type) this slot accepts. */
  category: string;
  /** Hotspot position inside the room, in percent of the room box. */
  x: number;
  y: number;
  /** Rendered size, in percent of room width. */
  size: number;
  /** Shown when the slot is empty. */
  placeholder: string;
  hint: string;
};

export const DORM_SLOTS: DormSlot[] = [
  { id: "window", label: "Window", category: "dorm_window", x: 70, y: 24, size: 16, placeholder: "🪟", hint: "A view over the Academy grounds" },
  { id: "poster", label: "Wall Decoration", category: "dorm_poster", x: 45, y: 20, size: 13, placeholder: "🖼️", hint: "Posters and art for your wall" },
  { id: "flag", label: "Academy Flag", category: "dorm_flag", x: 88, y: 17, size: 11, placeholder: "🚩", hint: "Fly your Academy colours" },
  { id: "bookshelf", label: "Bookshelf", category: "dorm_shelf", x: 11, y: 46, size: 16, placeholder: "📚", hint: "Store your knowledge" },
  { id: "trophy", label: "Trophy Shelf", category: "dorm_trophy", x: 25, y: 24, size: 13, placeholder: "🏆", hint: "Show off a favourite trophy" },
  { id: "lamp", label: "Lighting", category: "dorm_lamp", x: 87, y: 44, size: 12, placeholder: "🕯️", hint: "Set the mood of your room" },
  { id: "desk", label: "Study Desk", category: "dorm_desk", x: 32, y: 62, size: 18, placeholder: "🪑", hint: "Where every Quest begins" },
  { id: "chair", label: "Chair", category: "dorm_chair", x: 47, y: 70, size: 13, placeholder: "💺", hint: "Comfort for long study nights" },
  { id: "bed", label: "Bed", category: "dorm_bed", x: 76, y: 66, size: 19, placeholder: "🛏️", hint: "Rest between adventures" },
  { id: "plant", label: "Floor Decoration", category: "dorm_plant", x: 8, y: 76, size: 13, placeholder: "🪴", hint: "A little Academy greenery" },
  { id: "rug", label: "Rug", category: "dorm_rug", x: 50, y: 86, size: 20, placeholder: "🧶", hint: "Tie the room together" },
];

export const DORM_SLOT_BY_ID = new Map(DORM_SLOTS.map((s) => [s.id, s]));

/** slotId -> owned item id (or null). Persisted in `dorm_layouts.slots`. */
export type DormLayout = Record<string, string | null>;

export type DormDecoration = {
  id: string;
  code: string;
  type: string;
  name: string;
  value: string;
  icon: string | null;
  description: string | null;
  rarity: string;
  price_coins: number;
};

export type DormTrophy = {
  id: string;
  icon: string;
  name: string;
  detail: string | null;
  kind: "dungeon" | "rank" | "graduation" | "seasonal" | "award";
};

export type DormAchievement = {
  code: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  unlocked: boolean;
  percent: number;
};

export type DormHero = {
  name: string;
  username: string | null;
  avatar: string | null;
  frame: string | null;
  title: string | null;
  badge: string | null;
  level: number;
  xp: number;
  coins: number;
  rankName: string | null;
  rankIcon: string | null;
  rankColor: string | null;
};

export type DormState = {
  hero: DormHero;
  layout: DormLayout;
  owned: DormDecoration[];
  trophies: DormTrophy[];
  achievements: DormAchievement[];
};
