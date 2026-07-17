import { motion } from "framer-motion";
import { ChevronRight, Swords } from "lucide-react";

export type BuildingObjective = {
  id: string;
  subjectId: string;
  name: string;
  nextQuest: number | null;
  bossReady?: boolean;
};

/**
 * Shared "Current Objective" bar for every building interior
 * (Math wings, Science labs, Language halls).
 *
 * Shows exactly ONE mission at a time and renders a CTA that
 * routes to the same dungeon. Fully responsive: on narrow
 * screens (Android portrait) the CTA drops below the label so
 * nothing clips or overflows.
 */
export function BuildingObjectiveBar({
  objective,
  onEnter,
  accent = "amber",
}: {
  objective: BuildingObjective | null;
  onEnter: (o: BuildingObjective) => void;
  accent?: "amber" | "emerald" | "sky";
}) {
  if (!objective) return null;

  const palette = {
    amber: {
      border: "border-amber-400/40",
      label: "text-amber-300",
      body: "text-amber-50",
      sub: "text-amber-100/70",
      cta: "linear-gradient(135deg,#fde68a,#f59e0b,#c2410c)",
      shadow: "0 20px 60px -15px rgba(251,191,36,0.45), inset 0 1px 0 rgba(255,255,255,0.1)",
    },
    emerald: {
      border: "border-emerald-400/40",
      label: "text-emerald-300",
      body: "text-emerald-50",
      sub: "text-emerald-100/70",
      cta: "linear-gradient(135deg,#a7f3d0,#10b981,#065f46)",
      shadow: "0 20px 60px -15px rgba(16,185,129,0.45), inset 0 1px 0 rgba(255,255,255,0.1)",
    },
    sky: {
      border: "border-sky-400/40",
      label: "text-sky-300",
      body: "text-sky-50",
      sub: "text-sky-100/70",
      cta: "linear-gradient(135deg,#bae6fd,#0ea5e9,#1e3a8a)",
      shadow: "0 20px 60px -15px rgba(14,165,233,0.45), inset 0 1px 0 rgba(255,255,255,0.1)",
    },
  }[accent];

  const questLine = objective.bossReady
    ? "Boss Battle Ready"
    : objective.nextQuest !== null
      ? `Learning Quest ${String(objective.nextQuest).padStart(2, "0")}`
      : "Continue the campaign";

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="pointer-events-none fixed inset-x-0 bottom-3 sm:bottom-6 flex justify-center px-3 sm:px-4 z-30"
    >
      <div
        className={`pointer-events-auto relative w-full max-w-xl rounded-2xl border ${palette.border} bg-gradient-to-r from-black/85 via-stone-950/85 to-black/85 backdrop-blur-md p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3`}
        style={{ boxShadow: palette.shadow }}
      >
        <div className="min-w-0 flex-1">
          <div className={`text-[9px] uppercase tracking-[0.35em] ${palette.label} font-bold`}>
            Current Objective
          </div>
          <div className={`font-serif text-base sm:text-lg font-black ${palette.body} leading-tight break-words`}>
            <Swords className="inline h-4 w-4 mr-1 -mt-0.5" />
            Continue {objective.name}
          </div>
          <div className={`text-[11px] ${palette.sub} mt-0.5`}>{questLine}</div>
        </div>
        <button
          onClick={() => onEnter(objective)}
          className="w-full sm:w-auto shrink-0 relative overflow-hidden rounded-xl px-4 py-2.5 text-[11px] sm:text-xs font-black uppercase tracking-[0.18em] text-black transition-transform hover:scale-105 active:scale-95 inline-flex items-center justify-center gap-1"
          style={{
            background: palette.cta,
            boxShadow: "0 8px 20px -6px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.55)",
          }}
        >
          Enter Dungeon <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
