/**
 * BuildingEngine — the generic, config-driven renderer for every academic
 * building on campus.
 *
 * Given a BuildingCurriculum, the engine loads its runtime data (subjects,
 * chapters, progress, wing resolution, dungeons, recommended objective) and
 * dispatches to the correct variant renderer. No subject-specific logic
 * lives here — all specifics come from BuildingCurriculum.render.
 *
 * To add a new building (History Museum, Coding Lab, AI Research Centre…)
 * add an entry to `src/lib/curriculum/config.ts` and expose it via a thin
 * route file that renders `<BuildingEngine buildingId="..." />`.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { getBuilding } from "@/lib/curriculum";
import { useBuildingData } from "@/lib/building/useBuildingData";
import { WingChooser, type WingOption } from "@/components/building/WingChooser";
import { SimpleRenderer } from "@/components/building/renderers/SimpleRenderer";
import { HallRenderer } from "@/components/building/renderers/HallRenderer";
import { BuildingArrival } from "@/components/building/BuildingArrival";

export function BuildingEngine({ buildingId }: { buildingId: string }) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const building = getBuilding(buildingId);

  // Arrival sequence: brief overlay + staggered reveal of the interior.
  // Only played on the very first mount for a given building id.
  const [arrivalVisible, setArrivalVisible] = useState(true);
  const [interiorRevealed, setInteriorRevealed] = useState(false);

  useEffect(() => {
    if (!building) return;
    const overlayMs = reduced ? 250 : 1200;
    const revealMs = reduced ? 200 : 900;
    const t1 = window.setTimeout(() => setInteriorRevealed(true), revealMs);
    const t2 = window.setTimeout(() => setArrivalVisible(false), overlayMs);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [building, reduced]);

  if (!building) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black text-white/80">
        Unknown building: {buildingId}
      </div>
    );
  }
  if (!building.render) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black text-white/80">
        Building "{buildingId}" is missing a render configuration.
      </div>
    );
  }

  const data = useBuildingData(building);
  const {
    wingOptions,
    selectedWingId,
    selectWing,
    clearWing,
    activeWing,
    interiorTitle,
    dungeons,
    recommended,
    stats,
    cadetName,
  } = data;

  function exitBuilding() {
    if (selectedWingId) {
      clearWing();
      return;
    }
    navigate({ to: "/app" });
  }

  function enterDungeon(subjectId: string, dungeonId: string) {
    navigate({
      to: "/app/journey/$worldId/$dungeonId",
      params: { worldId: subjectId, dungeonId },
    });
  }

  // Build the interior tree. It sits under the arrival overlay and fades
  // in with a staggered reveal so titles/mentor/wings land smoothly.
  const interior = (() => {
    if (!activeWing) {
      const options: WingOption[] =
        wingOptions.length > 0
          ? wingOptions.map((w) => ({ ...w, onEnter: () => selectWing(w.id) }))
          : [
              {
                id: "empty",
                name: "No Halls Yet",
                tag: "Awaiting",
                emoji: "🕯️",
                description:
                  building.emptyText ??
                  "Content will appear here once configured for your class.",
                gradient: "linear-gradient(135deg,#334155,#0f172a)",
                glow: "rgba(148,163,184,0.3)",
                locked: true,
                onEnter: () => {},
              },
            ];

      return (
        <WingChooser
          title={building.title}
          subtitle={building.subtitle}
          onExit={exitBuilding}
          wings={options}
        />
      );
    }

    const variant = building.render!.variant;
    if (variant === "hall") {
      return (
        <HallRenderer
          building={building}
          title={interiorTitle}
          cadetName={cadetName}
          dungeons={dungeons}
          stats={stats}
          onExit={exitBuilding}
        />
      );
    }

    return (
      <SimpleRenderer
        building={building}
        title={interiorTitle}
        dungeons={dungeons}
        recommended={recommended}
        onExit={exitBuilding}
        onEnterDungeon={enterDungeon}
      />
    );
  })();

  return (
    <>
      <AnimatePresence>
        {interiorRevealed && (
          <motion.div
            key="building-interior"
            initial={{ opacity: 0, y: reduced ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.15 : 0.5, ease: "easeOut" }}
          >
            {interior}
          </motion.div>
        )}
      </AnimatePresence>
      <BuildingArrival building={building} visible={arrivalVisible} />
    </>
  );
}
