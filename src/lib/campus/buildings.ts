/**
 * Academy World — Building Registry
 *
 * Single source of truth for which buildings exist in the campus.
 * Adding a new building = append an entry here. Positions are computed
 * by the layout engine (see ./layoutEngine.ts), never hardcoded.
 */

export type BuildingKind =
  | "math"
  | "science"
  | "library"
  | "merchant"
  | "arena"
  | "hall"
  | "residence"
  | "future";

export type BuildingLane = "back" | "front";

export type BuildingDef = {
  id: string;
  kind: BuildingKind;
  name: string;
  tag: string;
  route?: string;
  match?: string[];
  locked?: boolean;
  /** Visual importance multiplier, applied on top of the per-breakpoint base scale. */
  weight?: number;
  /** Which campus row this building prefers. Engine spills to the next lane if a lane fills up. */
  preferredLane?: BuildingLane;
};

/**
 * Display order = visual priority (front-most / most-important first within a lane).
 * Order within a lane preference determines slot assignment on desktop/tablet
 * and cell order on mobile.
 */
export const BUILDINGS: BuildingDef[] = [
  { id: "library",   kind: "library",   name: "Language Library",     tag: "Scriptorium",    route: "/app/building/library", match: ["english","hindi","language","urdu","sanskrit","lang"], weight: 0.9,  preferredLane: "back"  },
  { id: "math",      kind: "math",      name: "Mathematics Building", tag: "Numeric Halls",  match: ["math"],                                                                    weight: 1.0,  preferredLane: "back"  },
  { id: "science",   kind: "science",   name: "Science Laboratory",   tag: "Alchemy Wing",   route: "/app/building/science", match: ["science","physics","chem","bio"],          weight: 1.05, preferredLane: "back"  },
  { id: "hall",      kind: "hall",      name: "Hall of Fame",         tag: "Champions",      route: "/app/leaderboard",                                                          weight: 1.0,  preferredLane: "back"  },
  { id: "residence", kind: "residence", name: "Residence",            tag: "Your Quarters",  route: "/app/profile",                                                              weight: 0.85, preferredLane: "back"  },
  { id: "arena",     kind: "arena",     name: "Arena Coliseum",       tag: "Duelists' Ring", route: "/app/pvp",                                                                  weight: 1.0,  preferredLane: "front" },
  { id: "future",    kind: "future",    name: "Observatory",          tag: "Coming Soon",    locked: true,                                                                       weight: 0.9,  preferredLane: "front" },
  { id: "merchant",  kind: "merchant",  name: "Merchant's Emporium",  tag: "Bazaar",         route: "/app/shop",                                                                 weight: 0.9,  preferredLane: "front" },
];
