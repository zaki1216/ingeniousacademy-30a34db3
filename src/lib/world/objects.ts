import type { WorldObject } from "./types";

/**
 * Static world objects — the scenery of the Academy. Each entry maps to
 * a renderer key in `worldRenderers`. Buildings live in the campus
 * building registry (`src/lib/campus/buildings.ts`) and are injected
 * into the engine at runtime by AcademyWorld so gameplay state stays
 * co-located with the interactive layer.
 *
 * Adding a new decoration, landmark, or ambient effect only requires:
 *   1. Add an entry here.
 *   2. Register the renderer key in `worldRenderers.tsx`.
 */
export const WORLD_OBJECTS: WorldObject[] = [
  /* -------------------------- Background layer -------------------------- */
  { id: "sky", type: "decoration", layer: "background", renderer: "sky" },
  {
    id: "clouds",
    type: "ambient_effect",
    layer: "background",
    renderer: "clouds",
    animation: { animated: true, loop: true },
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
    id: "birds",
    type: "ambient_effect",
    layer: "background",
    renderer: "birds",
    animation: { animated: true, loop: true },
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
    id: "torches",
    type: "decoration",
    layer: "decorations",
    renderer: "torches",
    animation: { animated: true, loop: true },
  },

  /* --------------------------- Ambient layer ---------------------------- */
  {
    id: "sparkles",
    type: "ambient_effect",
    layer: "ambient",
    renderer: "sparkles",
    animation: { animated: true, loop: true },
  },

  /* ---------------------------- HUD layer ------------------------------- */
  { id: "vignette", type: "decoration", layer: "hud", renderer: "vignette" },
];
