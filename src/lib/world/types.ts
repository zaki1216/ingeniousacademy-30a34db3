/**
 * Academy World Engine — core types.
 *
 * The World Engine renders every static element of the Academy from
 * configuration. Buildings, player, and interactive gameplay remain owned
 * by AcademyWorld; the engine is responsible for background scenery,
 * decorations, and future NPCs / weather / ambient events.
 *
 * The types intentionally include forward-looking fields (interaction,
 * animation, visibility, metadata) so new object categories can be added
 * without changing the engine surface.
 */

/** Rendering layers, drawn in ascending order. */
export type WorldLayer =
  | "background" // sky, clouds, distant mountains
  | "ground" // grass, plaza, paths
  | "decorations" // trees, torches, gardens, fountain
  | "buildings" // rendered by AcademyWorld (interactive)
  | "characters" // NPCs, player — future / partial
  | "ambient" // sparkles, weather overlays
  | "hud"; // travel labels, vignette

/** Object categories in the Academy. */
export type WorldObjectType =
  | "academic_building"
  | "decoration"
  | "landmark"
  | "path"
  | "garden"
  | "npc"
  | "interactive"
  | "ambient_effect";

/** Named campus zones. Config-only — no visual rendering yet. */
export type WorldZoneId =
  | "academic_district"
  | "central_plaza"
  | "residential_area"
  | "arena_district"
  | "marketplace"
  | "hall_of_fame";

export type Breakpoint = "desktop" | "tablet" | "mobile";

/** Simple predicate for future visibility rules (time of day, weather, event). */
export type WorldVisibilityRule = {
  breakpoints?: Breakpoint[];
  hidden?: boolean;
  /** Reserved for future dynamic rules — evaluated by the engine when present. */
  when?: (ctx: WorldRuntimeContext) => boolean;
};

export type WorldRuntimeContext = {
  breakpoint: Breakpoint;
  /** Reserved fields for future features. */
  timeOfDay?: "dawn" | "day" | "dusk" | "night";
  weather?: "clear" | "rain" | "snow" | "fog";
  season?: "spring" | "summer" | "autumn" | "winter";
  event?: string;
};

export type WorldInteraction = {
  onClick?: () => void;
  hoverable?: boolean;
  cursor?: string;
};

export type WorldAnimation = {
  /** Marks the renderer as animated so it can be memoized separately. */
  animated?: boolean;
  loop?: boolean;
};

/**
 * A single object in the Academy world. `renderer` is a stable key into
 * the renderer registry — the engine dispatches to that component and
 * passes the object itself as props.
 */
export type WorldObject = {
  id: string;
  type: WorldObjectType;
  layer: WorldLayer;
  renderer: string;
  zone?: WorldZoneId;
  /** Percent-based coordinates on the canvas (0..100). Optional for full-bleed layers. */
  position?: { x: number; y: number };
  size?: { width?: number; height?: number };
  visibility?: WorldVisibilityRule;
  interaction?: WorldInteraction;
  animation?: WorldAnimation;
  /** Free-form future metadata (dialogue, quest flags, seasonal skins, …). */
  metadata?: Record<string, unknown>;
};

export type WorldZone = {
  id: WorldZoneId;
  name: string;
  description: string;
  /** Bounding box in canvas % — informational for now. */
  bounds?: { x: number; y: number; width: number; height: number };
};
