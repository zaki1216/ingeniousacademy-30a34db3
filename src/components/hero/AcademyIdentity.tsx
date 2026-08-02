import { Compass, Flag, MapPin, Target } from "lucide-react";

import { ADVENTURE_TERMS } from "@/lib/adventure/terminology";
import { useContinueLearning, useDailyMissions } from "@/lib/learning/useContinueLearning";
import type { HeroJourney } from "@/lib/hero/types";

/** Academy Identity — where the hero currently stands in the journey. */
export function AcademyIdentity({ journey }: { journey: HeroJourney }) {
  const { data: cont } = useContinueLearning();
  const { data: missions } = useDailyMissions();

  const target = cont?.target ?? null;
  const activeMission =
    missions?.missions.find((m) => !m.complete) ?? missions?.missions[0] ?? null;

  return (
    <div className="rune-border holo-card p-4 sm:p-5 space-y-4">
      <div>
        <div className="flex items-end justify-between gap-3 mb-1.5">
          <span className="text-[11px] font-orbitron uppercase tracking-[0.2em] text-[var(--rune)]">
            Overall Completion
          </span>
          <span className="text-sm font-orbitron font-bold">
            {journey.overallPercent}%{" "}
            <span className="text-muted-foreground text-[11px]">
              ({journey.overallDone}/{journey.overallTotal})
            </span>
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full transition-all duration-700"
            style={{ width: `${journey.overallPercent}%`, background: "var(--gradient-xp)" }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <JourneyTile
          icon={<MapPin className="h-4 w-4 text-cyan-300" />}
          label={`Current ${ADVENTURE_TERMS.dungeon}`}
          value={target?.chapterName ?? "Not started"}
          sub={target ? `${target.chapterDone}/${target.chapterTotal} quests` : null}
        />
        <JourneyTile
          icon={<Flag className="h-4 w-4 text-amber-300" />}
          label={`Current ${ADVENTURE_TERMS.quest}`}
          value={
            target?.guardianReady
              ? ADVENTURE_TERMS.masterTrial
              : (target?.lectureTitle ?? "Choose a building")
          }
          sub={target?.subjectName ?? null}
        />
        <JourneyTile
          icon={<Target className="h-4 w-4 text-emerald-300" />}
          label="Current Mission"
          value={activeMission?.label ?? "All missions done"}
          sub={
            activeMission ? `${activeMission.progress}/${activeMission.target}` : "Come back tomorrow"
          }
        />
      </div>

      <div>
        <div className="text-[11px] font-orbitron uppercase tracking-[0.2em] text-[var(--rune)] mb-2 flex items-center gap-1.5">
          <Compass className="h-3.5 w-3.5" /> {ADVENTURE_TERMS.building} Progress
        </div>
        {journey.buildings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No buildings assigned yet — your Academy class is being prepared.
          </p>
        ) : (
          <div className="space-y-2.5">
            {journey.buildings.map((b) => (
              <div key={b.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold truncate">{b.name}</span>
                  <span className="text-muted-foreground font-orbitron">
                    {b.done}/{b.total} · {b.percent}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${b.percent}%`,
                      background: "linear-gradient(90deg,#38bdf8,#a78bfa)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function JourneyTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string | null;
}) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3 min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 text-sm font-extrabold leading-snug break-words">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
    </div>
  );
}
