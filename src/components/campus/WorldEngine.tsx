import { Fragment, memo, useMemo, type ReactNode } from "react";
import { WORLD_OBJECTS } from "@/lib/world/objects";
import { worldRenderers } from "./worldRenderers";
import type { WorldLayer, WorldObject, WorldRuntimeContext } from "@/lib/world/types";

/**
 * Academy World Engine.
 *
 * Iterates configured world objects, filters by runtime context and
 * visibility rules, and renders them in layer order. Interactive layers
 * (buildings, player, HUD) are still owned by AcademyWorld and passed
 * in via `slots` so gameplay state stays out of this pure pipeline.
 *
 * Adding a new object type is a two-step, no-engine-change process:
 *   1. Add to WORLD_OBJECTS
 *   2. Register the renderer key in worldRenderers.
 */

export type WorldEngineSlots = Partial<Record<WorldLayer, ReactNode>>;

const LAYER_ORDER: WorldLayer[] = [
  "background",
  "ground",
  "decorations",
  "buildings",
  "characters",
  "ambient",
  "hud",
];

function isVisible(obj: WorldObject, ctx: WorldRuntimeContext): boolean {
  const v = obj.visibility;
  if (!v) return true;
  if (v.hidden) return false;
  if (v.breakpoints && !v.breakpoints.includes(ctx.breakpoint)) return false;
  if (v.when && !v.when(ctx)) return false;
  return true;
}

export type WorldEngineProps = {
  context: WorldRuntimeContext;
  /** Extra objects injected at runtime (e.g. buildings from campus registry). */
  extraObjects?: WorldObject[];
  /** Interactive content per layer, rendered after config objects of the same layer. */
  slots?: WorldEngineSlots;
};

export const WorldEngine = memo(function WorldEngine({
  context,
  extraObjects,
  slots,
}: WorldEngineProps) {
  const grouped = useMemo(() => {
    const all = extraObjects ? [...WORLD_OBJECTS, ...extraObjects] : WORLD_OBJECTS;
    const buckets: Record<WorldLayer, WorldObject[]> = {
      background: [],
      ground: [],
      decorations: [],
      buildings: [],
      characters: [],
      ambient: [],
      hud: [],
    };
    for (const obj of all) {
      if (!isVisible(obj, context)) continue;
      buckets[obj.layer].push(obj);
    }
    return buckets;
  }, [context, extraObjects]);

  return (
    <>
      {LAYER_ORDER.map((layer) => {
        const objects = grouped[layer];
        const slot = slots?.[layer];
        if (objects.length === 0 && !slot) return null;
        return (
          <Fragment key={layer}>
            {objects.map((obj) => {
              const Renderer = worldRenderers[obj.renderer];
              if (!Renderer) {
                if (import.meta.env.DEV) {
                  console.warn(`[WorldEngine] missing renderer "${obj.renderer}" for object "${obj.id}"`);
                }
                return null;
              }
              return <Renderer key={obj.id} />;
            })}
            {slot}
          </Fragment>
        );
      })}
    </>
  );
});
