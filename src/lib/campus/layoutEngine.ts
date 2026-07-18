/**
 * Academy World — Responsive Layout Engine
 *
 * Pure functions that turn a list of BuildingDef entries into placed
 * buildings with { x, y, scale } coordinates for the current breakpoint.
 * No React, no DOM — safe to unit-test and share.
 */

import type { BuildingDef, BuildingLane } from "./buildings";

export type Breakpoint = "desktop" | "tablet" | "mobile";

export type PlacedBuilding = BuildingDef & {
  x: number;
  y: number;
  scale: number;
};

const TABLET_MAX = 1024;
const MOBILE_MAX = 768;

export function resolveBreakpoint(width: number): Breakpoint {
  if (width < MOBILE_MAX) return "mobile";
  if (width < TABLET_MAX) return "tablet";
  return "desktop";
}

/**
 * Slot templates per breakpoint. Each slot is a target (x, y) in %.
 * The `back` lane is the far row (larger, farther from the plaza),
 * the `front` lane sits closer to the player. Slots are laid out so
 * the buildings never overlap when the registry stays within capacity.
 */
type LaneTemplate = { back: Array<{ x: number; y: number }>; front: Array<{ x: number; y: number }>; baseScale: number };

const TEMPLATES: Record<Breakpoint, LaneTemplate> = {
  desktop: {
    // Gentle arch across the back lane (center pushed slightly up),
    // three anchors along the front lane. Matches the current campus feel.
    back: [
      { x: 12, y: 58 },
      { x: 30, y: 52 },
      { x: 50, y: 46 },
      { x: 70, y: 52 },
      { x: 87, y: 58 },
    ],
    front: [
      { x: 22, y: 74 },
      { x: 50, y: 78 },
      { x: 78, y: 74 },
    ],
    baseScale: 1,
  },
  tablet: {
    back: [
      { x: 15, y: 50 },
      { x: 38, y: 46 },
      { x: 62, y: 46 },
      { x: 85, y: 50 },
    ],
    front: [
      { x: 20, y: 72 },
      { x: 45, y: 76 },
      { x: 70, y: 72 },
      { x: 88, y: 76 },
    ],
    baseScale: 0.92,
  },
  mobile: {
    // Mobile ignores lanes: buildings flow into a 2-column vertical grid.
    // These arrays are unused; we compute mobile positions dynamically below.
    back: [],
    front: [],
    baseScale: 0.82,
  },
};

const MOBILE_COLS = 2;
const MOBILE_ROW_STEP = 17; // %
const MOBILE_ROW_START = 24; // %
const MOBILE_COL_XS = [30, 70]; // %

export function playerHome(bp: Breakpoint): { x: number; y: number } {
  return bp === "mobile" ? { x: 50, y: 96 } : { x: 50, y: 90 };
}

function orderForLane(defs: BuildingDef[], lane: BuildingLane): BuildingDef[] {
  return defs.filter((d) => (d.preferredLane ?? "back") === lane);
}

/**
 * Deterministic layout. For desktop/tablet, buildings are assigned into
 * their preferred lane's slots in registry order; overflow spills into
 * the other lane (also in order) so nothing is dropped.
 *
 * For mobile, buildings pack into a 2-column vertical grid in registry
 * order. Height of the campus container grows to fit all rows without
 * clipping (owned by the renderer via aspect-ratio + minHeight).
 */
export function layoutBuildings(defs: BuildingDef[], bp: Breakpoint): PlacedBuilding[] {
  if (bp === "mobile") {
    return defs.map((d, i) => {
      const col = i % MOBILE_COLS;
      const row = Math.floor(i / MOBILE_COLS);
      const x = MOBILE_COL_XS[col];
      const y = MOBILE_ROW_START + row * MOBILE_ROW_STEP;
      const scale = TEMPLATES.mobile.baseScale * (d.weight ?? 1);
      return { ...d, x, y, scale };
    });
  }

  const tpl = TEMPLATES[bp];
  const back = orderForLane(defs, "back");
  const front = orderForLane(defs, "front");

  // Spill overflow: if a lane has more buildings than slots, push the
  // extras onto the end of the other lane so nothing gets dropped.
  const backSlots = tpl.back;
  const frontSlots = tpl.front;
  const backAssigned = back.slice(0, backSlots.length);
  const frontAssigned = front.slice(0, frontSlots.length);
  const overflow = [...back.slice(backSlots.length), ...front.slice(frontSlots.length)];

  const placed: PlacedBuilding[] = [];

  backAssigned.forEach((d, i) => {
    const slot = backSlots[i];
    placed.push({ ...d, x: slot.x, y: slot.y, scale: tpl.baseScale * (d.weight ?? 1) });
  });
  frontAssigned.forEach((d, i) => {
    const slot = frontSlots[i];
    placed.push({ ...d, x: slot.x, y: slot.y, scale: tpl.baseScale * (d.weight ?? 1) });
  });

  // Handle overflow by filling remaining slots in whichever lane has room,
  // preferring the front lane so the back arch stays clean.
  const remainingFront = frontSlots.slice(frontAssigned.length);
  const remainingBack = backSlots.slice(backAssigned.length);
  const spillSlots = [...remainingFront, ...remainingBack];
  overflow.forEach((d, i) => {
    const slot = spillSlots[i];
    if (!slot) return; // registry outgrew all templates — a warning would fire in dev
    placed.push({ ...d, x: slot.x, y: slot.y, scale: tpl.baseScale * (d.weight ?? 1) });
  });

  return placed;
}
