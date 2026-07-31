/**
 * ContinueLearningCard — the single most important student CTA.
 * Rendered on Home, Academy, Progress, Profile and inside buildings.
 *
 * Variants:
 *  - hero    : large card for Home / Progress
 *  - compact : slim card for building interiors & profile
 *  - bar     : one-line HUD version
 */

import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Clock, Compass, Play, Shield, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { useContinueLearning } from "@/lib/learning/useContinueLearning";
import type { ContinueTarget } from "@/lib/learning/types";

type Variant = "hero" | "compact" | "bar";

function ctaLabel(status: string, target: ContinueTarget | null) {
  if (!target) return "Explore the Academy";
  if (target.guardianReady) return "Face the Guardian";
  return status === "start" ? "Start Learning" : "Continue Learning";
}

function subtitleFor(target: ContinueTarget | null) {
  if (!target) return "";
  if (target.guardianReady) return `${target.chapterName} · Guardian awaits`;
  const lesson = target.lectureTitle ? `Lesson ${target.lectureNumber}: ${target.lectureTitle}` : target.chapterName;
  return `${target.subjectName} · ${lesson}`;
}

export function ContinueLearningCard({
  variant = "hero",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  const { data, isLoading } = useContinueLearning();
  const target = data?.target ?? null;
  const status = data?.status ?? "no_content";

  if (isLoading) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-amber-400/20 bg-black/50 backdrop-blur-md animate-pulse",
          variant === "hero" ? "h-32" : variant === "compact" ? "h-20" : "h-11",
          className,
        )}
      />
    );
  }

  if (status === "no_content") {
    if (variant === "bar") return null;
    return (
      <div className={cn("rounded-2xl border border-white/10 bg-black/45 backdrop-blur-md p-4", className)}>
        <div className="text-sm font-bold text-amber-50">No lessons yet</div>
        <p className="text-xs text-amber-100/60 mt-1">
          Your teachers are still preparing your subjects. Check back soon.
        </p>
      </div>
    );
  }

  const allDone = status === "all_complete";
  const to = allDone || !target ? "/app/journey" : "/app/journey/$worldId/$dungeonId";
  const params = allDone || !target ? undefined : { worldId: target.subjectId, dungeonId: target.chapterId };
  const search = !allDone && target?.lectureId ? { lesson: target.lectureId } : undefined;

  if (variant === "bar") {
    return (
      <Link
        to={to}
        params={params as never}
        search={search as never}
        className={cn(
          "pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs tracking-[0.18em] text-amber-950 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 hover:brightness-110 shadow-[0_0_30px_-6px_rgba(251,191,36,0.7)]",
          className,
        )}
        style={{ fontFamily: "'Cinzel', serif" }}
      >
        <Play className="h-3.5 w-3.5 fill-current" />
        {allDone ? "REVISE" : "CONTINUE"}
      </Link>
    );
  }

  const compact = variant === "compact";

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-amber-400/30 backdrop-blur-md",
        compact ? "p-3" : "p-4 sm:p-5",
        className,
      )}
      style={{
        background: "linear-gradient(135deg, rgba(25,12,0,0.85), rgba(8,4,20,0.75))",
        boxShadow: "0 24px 60px -35px rgba(251,191,36,0.6)",
      }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] font-bold text-amber-300">
            {allDone ? <Sparkles className="h-3 w-3" /> : <Compass className="h-3 w-3" />}
            {allDone ? "All caught up" : "Your next step"}
          </div>
          <div
            className={cn(
              "mt-1 font-black text-amber-50 truncate",
              compact ? "text-base" : "text-lg sm:text-2xl",
            )}
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            {allDone ? "Every lesson complete" : target?.chapterName ?? "Begin your journey"}
          </div>
          <div className="text-[11px] sm:text-xs text-amber-100/70 truncate">
            {allDone ? "Revise a subject to keep your streak alive." : subtitleFor(target)}
          </div>

          {!allDone && target && (
            <div className="mt-2 flex items-center gap-3 text-[10px] text-amber-100/60 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> ~{Math.max(target.estimatedMinutes, 5)} min left
              </span>
              {target.guardianReady && (
                <span className="inline-flex items-center gap-1 text-amber-300">
                  <Shield className="h-3 w-3" /> Guardian ready
                </span>
              )}
              <span>
                {target.chapterDone}/{target.chapterTotal} lessons
              </span>
            </div>
          )}
        </div>

        <Link
          to={to}
          params={params as never}
          search={search as never}
          className={cn(
            "shrink-0 inline-flex items-center gap-2 rounded-xl font-black tracking-[0.15em] text-amber-950 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 hover:brightness-110 transition",
            compact ? "px-3 py-2 text-[10px]" : "px-4 py-2.5 text-xs",
          )}
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          {ctaLabel(status, target).toUpperCase()}
        </Link>
      </div>

      {!allDone && target && (
        <div className="mt-3 h-1.5 rounded-full bg-black/60 overflow-hidden border border-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${target.chapterPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-amber-300 to-orange-500"
          />
        </div>
      )}
    </motion.div>
  );
}
