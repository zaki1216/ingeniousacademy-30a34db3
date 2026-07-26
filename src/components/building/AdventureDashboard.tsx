/**
 * AdventureDashboard — quick-glance panel injected at the top of every
 * academic building interior. Communicates progress, current objective,
 * chapter rewards, and next action without redesigning the building shell.
 */

import { motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, Coins, Star, Trophy, ChevronRight, Target, Compass } from "lucide-react";

import type { EngineDungeon, EngineStats } from "@/lib/building/useBuildingData";

interface Props {
  cadetName: string;
  interiorTitle: string;
  dungeons: EngineDungeon[];
  stats: EngineStats;
  accent?: string;
}

export function AdventureDashboard({ cadetName, interiorTitle, dungeons, stats, accent = "#fbbf24" }: Props) {
  const navigate = useNavigate();
  const rec = stats.recommended;
  const nextLabel = rec
    ? rec.nextQuest
      ? `Quest ${rec.nextQuest} · ${rec.name}`
      : rec.passed >= rec.total && rec.total > 0
        ? `Chapter Challenge · ${rec.name}`
        : rec.name
    : dungeons.find((d) => d.unlocked)?.name ?? "Awaiting new content";

  const goRecommended = () => {
    if (!rec) return;
    navigate({
      to: "/app/journey/$worldId/$dungeonId",
      params: { worldId: rec.subjectId, dungeonId: rec.id },
    });
  };

  const totalRewardXp = dungeons.reduce((s, d) => s + (d.bossCleared ? 0 : d.rewardXp), 0);
  const totalRewardCoins = dungeons.reduce((s, d) => s + (d.bossCleared ? 0 : d.rewardCoins), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mx-auto w-full max-w-5xl px-3 sm:px-0"
    >
      <div
        className="relative rounded-2xl border backdrop-blur-md p-4 sm:p-5"
        style={{
          borderColor: `${accent}55`,
          background: "linear-gradient(135deg, rgba(0,0,0,0.75), rgba(20,10,0,0.6))",
          boxShadow: `0 20px 60px -30px ${accent}66, inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.35em] font-bold" style={{ color: accent }}>
              Adventure Log
            </div>
            <div className="mt-0.5 font-serif text-lg sm:text-xl font-black text-amber-50 truncate">
              Welcome back, {cadetName}
            </div>
            <div className="text-[11px] text-amber-100/60 truncate">{interiorTitle}</div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-amber-100/80">
            <Chip icon={<Trophy className="h-3 w-3" />} label={`${stats.cleared}/${stats.totalDungeons}`} sub="Chapters" accent={accent} />
            <Chip icon={<Target className="h-3 w-3" />} label={`${stats.passedQuests}/${stats.totalQuests}`} sub="Quests" accent={accent} />
            <Chip icon={<Sparkles className="h-3 w-3" />} label={`${stats.pct}%`} sub="Mastery" accent={accent} />
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] items-stretch">
          <button
            onClick={goRecommended}
            disabled={!rec}
            className="group text-left rounded-xl border border-white/10 bg-black/40 hover:border-white/25 transition-colors p-3 sm:p-4 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2">
              <Compass className="h-3.5 w-3.5" style={{ color: accent }} />
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold" style={{ color: accent }}>
                Next Objective
              </span>
            </div>
            <div className="mt-1 font-serif text-base sm:text-lg font-black text-amber-50 truncate">
              {nextLabel}
            </div>
            <div className="mt-1 text-[11px] text-amber-100/60 flex items-center gap-1">
              Continue your adventure
              <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          <div className="rounded-xl border border-white/10 bg-black/40 p-3 sm:p-4 flex sm:flex-col items-center sm:items-start justify-between gap-2 min-w-[140px]">
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold" style={{ color: accent }}>
              Unclaimed Loot
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-amber-50 font-bold text-sm">
                <Star className="h-3.5 w-3.5 text-amber-300" /> {totalRewardXp} XP
              </span>
              <span className="inline-flex items-center gap-1 text-amber-50 font-bold text-sm">
                <Coins className="h-3.5 w-3.5 text-yellow-300" /> {totalRewardCoins}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 h-1.5 rounded-full bg-black/50 overflow-hidden border border-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.pct}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
            className="h-full"
            style={{ background: `linear-gradient(90deg, ${accent}, #f97316)` }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function Chip({ icon, label, sub, accent }: { icon: React.ReactNode; label: string; sub: string; accent: string }) {
  return (
    <div
      className="rounded-lg border px-2 py-1 flex items-center gap-1.5 bg-black/40"
      style={{ borderColor: `${accent}44` }}
    >
      <span style={{ color: accent }}>{icon}</span>
      <span className="font-bold text-amber-50 text-[11px]">{label}</span>
      <span className="uppercase text-[9px] tracking-widest text-amber-100/50">{sub}</span>
    </div>
  );
}
