import type { WorldZone } from "./types";

/**
 * Logical zones of the Academy. These exist in configuration only and do
 * not render anything by themselves — future features (zone-scoped
 * weather, NPC patrols, event triggers) will read from this registry.
 */
export const WORLD_ZONES: WorldZone[] = [
  {
    id: "academic_district",
    name: "Academic District",
    description: "Halls of Mathematics, Science, and the Language Library.",
    bounds: { x: 5, y: 40, width: 90, height: 30 },
  },
  {
    id: "central_plaza",
    name: "Central Plaza",
    description: "The fountain courtyard where students gather.",
    bounds: { x: 30, y: 78, width: 40, height: 18 },
  },
  {
    id: "residential_area",
    name: "Residential Area",
    description: "Cadet quarters and the Residence hall.",
    bounds: { x: 40, y: 80, width: 20, height: 15 },
  },
  {
    id: "arena_district",
    name: "Arena District",
    description: "The dueling coliseum and battle grounds.",
    bounds: { x: 5, y: 70, width: 25, height: 20 },
  },
  {
    id: "marketplace",
    name: "Marketplace",
    description: "The Merchant's Emporium and traveling stalls.",
    bounds: { x: 40, y: 70, width: 20, height: 15 },
  },
  {
    id: "hall_of_fame",
    name: "Hall of Fame",
    description: "The marble hall of champions and legends.",
    bounds: { x: 70, y: 70, width: 25, height: 20 },
  },
];

export function getZone(id: WorldZone["id"]): WorldZone | undefined {
  return WORLD_ZONES.find((z) => z.id === id);
}
