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

import { useNavigate } from "@tanstack/react-router";

import { getBuilding } from "@/lib/curriculum";
import { useBuildingData } from "@/lib/building/useBuildingData";
import { WingChooser, type WingOption } from "@/components/building/WingChooser";
import { SimpleRenderer } from "@/components/building/renderers/SimpleRenderer";
import { HallRenderer } from "@/components/building/renderers/HallRenderer";

export function BuildingEngine({ buildingId }: { buildingId: string }) {
  const navigate = useNavigate();
  const building = getBuilding(buildingId);

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

  // 1) Wing selection — every building funnels through the same chooser.
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

  // 2) Interior — dispatch to the configured variant.
  const variant = building.render.variant;
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
}
