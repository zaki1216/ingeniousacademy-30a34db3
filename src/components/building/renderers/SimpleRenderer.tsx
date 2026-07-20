/**
 * SimpleRenderer — generic "lab / hall" interior variant.
 *
 * Renders any building whose `render.variant === "simple"`. Themed entirely
 * by the config passed via BuildingCurriculum.render.theme. Used today by the
 * Science Laboratory and Language Library; any new building can opt into it
 * by supplying a theme.
 */

import { motion } from "framer-motion";
import { DoorOpen } from "lucide-react";

import type { BuildingCurriculum } from "@/lib/curriculum/types";
import { BuildingObjectiveBar, type BuildingObjective } from "@/components/building/BuildingObjectiveBar";
import { DungeonCard } from "@/components/building/DungeonCard";
import type { EngineDungeon } from "@/lib/building/useBuildingData";

export function SimpleRenderer({
  building,
  title,
  dungeons,
  recommended,
  onExit,
  onEnterDungeon,
}: {
  building: BuildingCurriculum;
  title: string;
  dungeons: EngineDungeon[];
  recommended: BuildingObjective | null;
  onExit: () => void;
  onEnterDungeon: (subjectId: string, dungeonId: string) => void;
}) {
  const render = building.render!;
  const theme = render.theme;
  const emptyText = building.emptyText ?? "Content is being prepared.";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#050505]">
      <div className="fixed inset-0 -z-10" style={{ background: theme.background }} />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {Array.from({ length: 22 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full"
            style={{
              left: `${(i * 47) % 100}%`,
              top: `${(i * 29) % 100}%`,
              background: theme.particle,
              boxShadow: theme.particleShadow,
            }}
            animate={{ y: [0, -40, 0], opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: 6 + (i % 5), repeat: Infinity, delay: (i % 8) * 0.4 }}
          />
        ))}
      </div>

      <div className="relative min-h-screen flex flex-col p-4 sm:p-6 md:p-10">
        <div className="flex items-start justify-between gap-3">
          <button
            onClick={onExit}
            className={`flex items-center gap-2 rounded-full pl-2 pr-3 sm:pr-4 py-1.5 border border-white/25 bg-black/60 backdrop-blur-md hover:border-white/60`}
            style={{ color: theme.primary }}
          >
            <span
              className="h-6 w-6 sm:h-7 sm:w-7 rounded-full grid place-items-center border"
              style={{ borderColor: `${theme.primary}66`, background: `${theme.primary}22` }}
            >
              <DoorOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase font-serif">Back</span>
          </button>
        </div>

        <div className="text-center mt-6 sm:mt-10 max-w-2xl mx-auto">
          <div
            className="text-[10px] sm:text-xs uppercase tracking-[0.4em] font-bold"
            style={{ color: theme.primary }}
          >
            {render.tagLabel}
          </div>
          <h1
            className="mt-2 font-serif text-2xl sm:text-4xl font-black"
            style={{
              color: "#fefefe",
              fontFamily: "'Cinzel', serif",
              textShadow: `0 4px 30px ${theme.particle}`,
            }}
          >
            {title}
          </h1>
        </div>

        <div className="mt-8 max-w-5xl w-full mx-auto grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pb-40">
          {dungeons.map((d, i) => (
            <DungeonCard
              key={d.id}
              d={d}
              index={i}
              onEnter={() => onEnterDungeon(d.subjectId, d.id)}
              accent={theme.accent}
            />
          ))}
          {dungeons.length === 0 && (
            <div
              className="col-span-full text-center text-sm py-16"
              style={{ color: `${theme.primary}99` }}
            >
              {emptyText}
            </div>
          )}
        </div>
      </div>

      <BuildingObjectiveBar
        objective={recommended}
        accent={theme.accent}
        onEnter={(o) => onEnterDungeon(o.subjectId, o.id)}
      />
    </div>
  );
}
