import { useEffect, useMemo, useState } from "react";
import { BUILDINGS } from "./buildings";
import {
  layoutBuildings,
  playerHome,
  resolveBreakpoint,
  type Breakpoint,
  type PlacedBuilding,
} from "./layoutEngine";

function currentBreakpoint(): Breakpoint {
  if (typeof window === "undefined") return "desktop";
  return resolveBreakpoint(window.innerWidth);
}

/**
 * Watches the viewport for desktop / tablet / mobile transitions and
 * returns the placed buildings + player home for the current breakpoint.
 * The layout engine itself is pure; this hook is the only place with
 * DOM/media-query wiring.
 */
export function useCampusLayout() {
  const [bp, setBp] = useState<Breakpoint>(() => currentBreakpoint());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setBp(currentBreakpoint());
    update();
    const mqMobile = window.matchMedia("(max-width: 767.98px)");
    const mqTablet = window.matchMedia("(min-width: 768px) and (max-width: 1023.98px)");
    mqMobile.addEventListener("change", update);
    mqTablet.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mqMobile.removeEventListener("change", update);
      mqTablet.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const buildings = useMemo<PlacedBuilding[]>(
    () => layoutBuildings(BUILDINGS, bp),
    [bp],
  );
  const home = useMemo(() => playerHome(bp), [bp]);

  return { breakpoint: bp, buildings, playerHome: home, isMobile: bp === "mobile" };
}
