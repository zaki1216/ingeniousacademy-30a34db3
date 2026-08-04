/**
 * Academy Marketplace — configuration.
 *
 * The Marketplace is entirely configuration-driven: shops, the item types
 * each shop sells, and the equip slot every type maps to are declared here.
 * Adding a new shop (Dorm Decor, Music, Seasonal, Lumi Companion, …) or a new
 * item type only requires editing this file — no UI code changes.
 *
 * Items themselves live in the `shop_items` table and are managed by
 * administrators from the Marketplace Manager.
 */

export type Rarity = "common" | "rare" | "epic" | "legendary";

/** Every cosmetic slot a student can equip. One equipped item per slot. */
export type EquipSlot =
  | "avatar"
  | "outfit"
  | "frame"
  | "title"
  | "badge"
  | "nameplate"
  | "theme"
  | "celebration";

/** Slot -> `profiles` column. Keeps DB naming out of the UI. */
export const SLOT_COLUMN: Record<EquipSlot, string> = {
  avatar: "equipped_avatar",
  outfit: "equipped_outfit",
  frame: "equipped_frame",
  title: "equipped_title",
  badge: "equipped_badge",
  nameplate: "equipped_nameplate",
  theme: "equipped_theme",
  celebration: "equipped_celebration",
};

/** Item type -> equip slot. Unknown types fall back to `avatar`. */
export const TYPE_SLOT: Record<string, EquipSlot> = {
  avatar: "avatar",
  hair: "avatar",
  glasses: "avatar",
  uniform: "outfit",
  jacket: "outfit",
  shoes: "outfit",
  hat: "outfit",
  backpack: "outfit",
  frame: "frame",
  nameplate: "nameplate",
  theme: "theme",
  title: "title",
  badge: "badge",
  effect: "celebration",
};

export function slotForType(type: string): EquipSlot {
  return TYPE_SLOT[type] ?? "avatar";
}

export type ShopDef = {
  code: string;
  name: string;
  emoji: string;
  tagline: string;
  /** Item types sold here — also the category filter chips inside the shop. */
  types: { code: string; label: string }[];
  accent: string;
  /** Future shops render as "coming soon" stalls on the street. */
  comingSoon?: boolean;
};

export const SHOPS: ShopDef[] = [
  {
    code: "outfit_boutique",
    name: "Outfit Boutique",
    emoji: "👕",
    tagline: "Uniforms, jackets, boots and packs",
    accent: "#38bdf8",
    types: [
      { code: "uniform", label: "Uniforms" },
      { code: "jacket", label: "Jackets" },
      { code: "shoes", label: "Shoes" },
      { code: "hat", label: "Hats" },
      { code: "backpack", label: "Backpacks" },
    ],
  },
  {
    code: "avatar_studio",
    name: "Avatar Studio",
    emoji: "🎨",
    tagline: "Choose the hero everyone sees",
    accent: "#a78bfa",
    types: [
      { code: "avatar", label: "Avatars" },
      { code: "hair", label: "Hairstyles" },
      { code: "glasses", label: "Glasses" },
    ],
  },
  {
    code: "badge_gallery",
    name: "Badge Gallery",
    emoji: "🏅",
    tagline: "Badges and titles worth showing off",
    accent: "#fbbf24",
    types: [
      { code: "badge", label: "Badges" },
      { code: "title", label: "Titles" },
    ],
  },
  {
    code: "celebration_workshop",
    name: "Celebration Workshop",
    emoji: "✨",
    tagline: "Make every reward feel enormous",
    accent: "#f472b6",
    types: [{ code: "effect", label: "Celebrations" }],
  },
  {
    code: "frame_studio",
    name: "Profile Frame Studio",
    emoji: "🖼",
    tagline: "Frames, nameplates and backdrops",
    accent: "#34d399",
    types: [
      { code: "frame", label: "Frames" },
      { code: "nameplate", label: "Nameplates" },
      { code: "theme", label: "Backgrounds" },
    ],
  },
  /* ---------------- Reserved for future expansion ---------------- */
  {
    code: "dorm_decor",
    name: "Dorm Decor Store",
    emoji: "🏡",
    tagline: "Furniture and decor for My Academy",
    accent: "#fb923c",
    types: [
      { code: "dorm_desk", label: "Study Tables" },
      { code: "dorm_chair", label: "Chairs" },
      { code: "dorm_shelf", label: "Bookshelves" },
      { code: "dorm_bed", label: "Beds" },
      { code: "dorm_plant", label: "Plants" },
      { code: "dorm_rug", label: "Rugs" },
      { code: "dorm_poster", label: "Wall Posters" },
      { code: "dorm_lamp", label: "Lamps" },
      { code: "dorm_trophy", label: "Trophies" },
      { code: "dorm_flag", label: "Academy Flags" },
      { code: "dorm_window", label: "Window Themes" },
    ],
  },
  {
    code: "music_shop",
    name: "Music Shop",
    emoji: "🎵",
    tagline: "Themes for your Academy days",
    accent: "#60a5fa",
    types: [{ code: "music", label: "Tracks" }],
    comingSoon: true,
  },
  {
    code: "seasonal_shop",
    name: "Seasonal Shop",
    emoji: "🌤",
    tagline: "Limited-time collections",
    accent: "#f87171",
    types: [{ code: "seasonal", label: "Seasonal" }],
    comingSoon: true,
  },
  {
    code: "lumi_shop",
    name: "Lumi Companion Shop",
    emoji: "🤖",
    tagline: "Cosmetics for your Academy spirit",
    accent: "#22d3ee",
    types: [{ code: "companion", label: "Companion" }],
    comingSoon: true,
  },
];

export const SHOP_BY_CODE = new Map(SHOPS.map((s) => [s.code, s]));

export const RARITY_STYLE: Record<Rarity, { label: string; ring: string; text: string }> = {
  common: { label: "Common", ring: "rgba(148,163,184,0.6)", text: "#cbd5e1" },
  rare: { label: "Rare", ring: "rgba(56,189,248,0.7)", text: "#7dd3fc" },
  epic: { label: "Epic", ring: "rgba(167,139,250,0.75)", text: "#c4b5fd" },
  legendary: { label: "Legendary", ring: "rgba(251,191,36,0.85)", text: "#fcd34d" },
};

export type MarketplaceItem = {
  id: string;
  shop_code: string;
  type: string;
  code: string;
  name: string;
  value: string;
  description: string | null;
  icon: string | null;
  price_coins: number;
  rarity: Rarity;
  sort_order: number;
  enabled: boolean;
  release_at: string | null;
};

export type MarketplaceItemState = MarketplaceItem & {
  owned: boolean;
  equipped: boolean;
  affordable: boolean;
  upcoming: boolean;
  slot: EquipSlot;
};

export type MarketplaceState = {
  coins: number;
  equipped: Record<EquipSlot, string | null>;
  items: MarketplaceItemState[];
};
