# Academy World — Responsive Layout Engine Refactor

Architectural refactor only. No visual redesign, no route changes, no HUD/animation/gameplay changes. Buildings keep their identities, kinds, routes, tags, match keywords, and locked states.

## Goal

Replace the two hardcoded position arrays (`DESKTOP_BUILDINGS` and `MOBILE_BUILDINGS` inside `src/components/campus/AcademyWorld.tsx`) with:

1. A **building registry** — one config entry per building, no coordinates.
2. A **layout engine** — computes `{ x, y, scale }` per building for the current breakpoint from a lane/slot description.
3. A thin **renderer** — `AcademyWorld.tsx` reads the resolved positions and renders exactly as today.

Buildings preserved with unchanged routes: Language Library, Mathematics, Science, Hall of Fame, Residence, Arena, Merchant, Observatory (locked "Coming Soon").

## New files

- `src/lib/campus/buildings.ts` — Building registry. Array of `BuildingDef`:
  ```ts
  type BuildingDef = {
    id: string;                    // stable id
    kind: BuildingKind;            // "math" | "science" | "library" | "hall" | "residence" | "arena" | "merchant" | "future"
    name: string;
    tag: string;
    route?: string;
    match?: string[];
    locked?: boolean;
    weight?: number;               // visual importance (affects scale)
    preferredLane?: "back" | "mid" | "front"; // hint for layout engine
  };
  export const BUILDINGS: BuildingDef[];
  ```
  Order in the array = display priority. Adding a new building = append one entry.

- `src/lib/campus/layoutEngine.ts` — Pure layout computation:
  ```ts
  type Breakpoint = "desktop" | "tablet" | "mobile";
  type PlacedBuilding = BuildingDef & { x: number; y: number; scale: number };
  export function resolveBreakpoint(width: number): Breakpoint;
  export function layoutBuildings(defs: BuildingDef[], bp: Breakpoint): PlacedBuilding[];
  export function playerHome(bp: Breakpoint): { x: number; y: number };
  ```
  - Uses a **lane grid**: `back / mid / front` rows on desktop+tablet, vertical stack on mobile.
  - Allocates each building into a lane slot based on `preferredLane`, index, and available slots for the breakpoint.
  - Computes `x` from `slotIndex / (slotsInLane + 1)` mapped into a horizontal padding-safe range (e.g. 8%–92%).
  - Computes `y` from lane (back ≈ 46%, mid ≈ 58%, front ≈ 74% on desktop; compressed on tablet; single-column on mobile).
  - Applies min-spacing check — if two buildings collide within threshold, nudges along x.
  - Scale = base per-breakpoint × (weight or 1). Locked/utility buildings get a small negative weight.
  - Deterministic (no randomness) so layout is stable across renders.

- `src/lib/campus/useCampusLayout.ts` — Hook that watches `window.innerWidth` (matchMedia for `768px` and `1024px`), memoizes `layoutBuildings(BUILDINGS, bp)` and `playerHome(bp)`.

## Edited files

- `src/components/campus/AcademyWorld.tsx`
  - Delete `DESKTOP_BUILDINGS`, `MOBILE_BUILDINGS`, `PLAYER_HOME_DESKTOP`, `PLAYER_HOME_MOBILE`, the local `Building` type, and the `useIsMobile`-based selection.
  - Import `useCampusLayout()` → get `buildings` (already placed with x/y/scale) and `playerHome`.
  - Loop `buildings.map(b => …)` renders identically to today (same `<Building>` element, same click/hover handlers, same tag chips, same avatar/walk logic).
  - Everything else in the file (SVG backdrop, mentors, particles, camera-push transition, tooltip, click-to-walk, navigation) stays byte-identical apart from source of coordinates.

## Breakpoints

- Mobile: `< 768px` — single column, 2 buildings per row where width allows, otherwise stacked; container height grows so no clipping; no horizontal scroll.
- Tablet: `768–1023px` — two lanes (back+front), 3 slots per lane.
- Desktop: `≥ 1024px` — three lanes (back/mid/front), matches current visual arrangement of the 8 buildings.

Desktop slot targets are chosen so the resolved coordinates for the current 8 buildings are visually near today's hardcoded values (Library far-left back, Math mid-back, Science center-back, Hall mid-back-right, Residence far-right back, Arena front-left, Merchant front-right, Observatory front-center). Visual parity on desktop is the acceptance bar.

## Preserved (do not touch)

- All routes and route file names.
- HUD, minimap, Lumi, particle field, mentor NPCs, camera-push transition, click-to-walk animation, avatar rendering.
- Theme tokens, fonts, existing animations and timings.
- Building visual components (`<Building>` and its kind-specific SVG art).
- Locked-state behavior for Observatory.

## Acceptance

- Desktop screenshot of `/app` matches previous layout within a few percent per building.
- Resize from desktop → tablet → mobile: buildings rearrange, no overlap, no clipping, no horizontal scrollbar, all remain clickable and route correctly.
- Adding a 9th building = append to `BUILDINGS` array only; no changes to `AcademyWorld.tsx` or the engine.

## Out of scope

- No changes to `/app/welcome`, `/app/building/*`, journey, HUD, or any other route.
- No new dependencies.
- No redesign of building art or backdrop.
