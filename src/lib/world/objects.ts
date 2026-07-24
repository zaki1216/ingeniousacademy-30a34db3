import type { WorldObject, WorldRuntimeContext } from "./types";

/**
 * Static world objects — the scenery of the Academy. Each entry maps to
 * a renderer key in `worldRenderers`. Buildings live in the campus
 * building registry (`src/lib/campus/buildings.ts`) and are injected
 * into the engine at runtime by AcademyWorld so gameplay state stays
 * co-located with the interactive layer.
 *
 * Visibility rules keep the campus alive without hurting mobile perf:
 *   - Ambient effects (butterflies, leaves, fireflies, light rays)
 *     collapse to a calm still frame when reducedMotion is set.
 *   - Heavier decorative flourishes fall back on mobile.
 *
 * Adding a new decoration, landmark, or ambient effect only requires:
 *   1. Add an entry here.
 *   2. Register the renderer key in `worldRenderers.tsx`.
 */

const notReduced = (ctx: WorldRuntimeContext) => !ctx.reducedMotion;

export const WORLD_OBJECTS: WorldObject[] = [
  /* -------------------------- Background layer -------------------------- */
  { id: "sky", type: "decoration", layer: "background", renderer: "sky" },
  {
    id: "clouds",
    type: "ambient_effect",
    layer: "background",
    renderer: "clouds",
    animation: { animated: true, loop: true },
    visibility: { when: notReduced },
  },
  {
    id: "mountains-far",
    type: "landmark",
    layer: "background",
    renderer: "mountainsFar",
  },
  {
    id: "mountains-near",
    type: "landmark",
    layer: "background",
    renderer: "mountainsNear",
  },
  {
    id: "light-rays",
    type: "ambient_effect",
    layer: "background",
    renderer: "lightRays",
    visibility: { breakpoints: ["desktop", "tablet"] },
  },
  {
    id: "birds",
    type: "ambient_effect",
    layer: "background",
    renderer: "birds",
    animation: { animated: true, loop: true },
    visibility: { when: notReduced },
  },

  /* ---------------------------- Ground layer ---------------------------- */
  { id: "grounds", type: "decoration", layer: "ground", renderer: "grounds" },
  { id: "paths", type: "path", layer: "ground", renderer: "paths", zone: "central_plaza" },

  /* -------------------------- Decorations layer ------------------------- */
  {
    id: "gardens-and-fountain",
    type: "garden",
    layer: "decorations",
    renderer: "gardensAndFountain",
    zone: "central_plaza",
    animation: { animated: true, loop: true },
  },
  { id: "trees", type: "decoration", layer: "decorations", renderer: "trees", animation: { animated: true, loop: true } },
  {
    id: "bushes",
    type: "decoration",
    layer: "decorations",
    renderer: "bushes",
  },
  {
    id: "flower-beds",
    type: "garden",
    layer: "decorations",
    renderer: "flowerBeds",
    visibility: { breakpoints: ["desktop", "tablet"] },
  },
  {
    id: "benches",
    type: "decoration",
    layer: "decorations",
    renderer: "benches",
    visibility: { breakpoints: ["desktop", "tablet"] },
  },
  {
    id: "lanterns",
    type: "decoration",
    layer: "decorations",
    renderer: "lanterns",
    animation: { animated: true, loop: true },
  },
  {
    id: "banners",
    type: "decoration",
    layer: "decorations",
    renderer: "banners",
    animation: { animated: true, loop: true },
    visibility: { breakpoints: ["desktop", "tablet"] },
  },
  {
    id: "signboards",
    type: "decoration",
    layer: "decorations",
    renderer: "signboards",
    visibility: { breakpoints: ["desktop"] },
  },
  {
    id: "torches",
    type: "decoration",
    layer: "decorations",
    renderer: "torches",
    animation: { animated: true, loop: true },
  },

  /* --------------------------- Ambient layer ---------------------------- */
  {
    id: "butterflies",
    type: "ambient_effect",
    layer: "ambient",
    renderer: "butterflies",
    animation: { animated: true, loop: true },
    visibility: { when: notReduced },
  },
  {
    id: "drifting-leaves",
    type: "ambient_effect",
    layer: "ambient",
    renderer: "driftingLeaves",
    animation: { animated: true, loop: true },
    visibility: { breakpoints: ["desktop", "tablet"], when: notReduced },
  },
  {
    id: "fireflies",
    type: "ambient_effect",
    layer: "ambient",
    renderer: "fireflies",
    animation: { animated: true, loop: true },
    visibility: { breakpoints: ["desktop", "tablet"], when: notReduced },
  },
  {
    id: "sparkles",
    type: "ambient_effect",
    layer: "ambient",
    renderer: "sparkles",
    animation: { animated: true, loop: true },
    visibility: { when: notReduced },
  },

  /* ---------------------------- HUD layer ------------------------------- */
  { id: "vignette", type: "decoration", layer: "hud", renderer: "vignette" },
];
