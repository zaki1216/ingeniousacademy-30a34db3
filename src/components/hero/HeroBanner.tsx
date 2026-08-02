import { motion } from "framer-motion";
import { Coins, Crown, Zap } from "lucide-react";

import { AcademyRankCard } from "@/components/rpg/AcademyRankCard";
import { levelProgress } from "@/lib/gamification/leveling";
import type { HeroIdentity, HeroStats } from "@/lib/hero/types";

/** Hero Banner — avatar, name, @username, rank, level, XP and coins. */
export function HeroBanner({ identity, stats }: { identity: HeroIdentity; stats: HeroStats }) {
  const p = levelProgress(stats.xp);
  const avatar = identity.avatar || "🧑‍🎓";
  const frameStyle = identity.frame
    ? { background: identity.frame }
    : { background: "var(--gradient-monarch)" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rune-border holo-card monarch-glow relative overflow-hidden p-5 sm:p-6"
    >
      {/* Academy-themed banner backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at 15% -20%, color-mix(in oklab, #f59e0b 26%, transparent), transparent 55%), radial-gradient(ellipse at 95% 120%, color-mix(in oklab, var(--monarch) 40%, transparent), transparent 60%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-25"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, transparent 0 18px, color-mix(in oklab, var(--rune) 35%, transparent) 18px 19px)",
          maskImage: "linear-gradient(to bottom, black, transparent)",
        }}
      />

      <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="relative shrink-0">
          <div
            className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-3xl p-[3px]"
            style={frameStyle}
          >
            <div className="h-full w-full rounded-[20px] bg-[var(--bg-void)] grid place-items-center text-6xl sm:text-7xl">
              {avatar}
            </div>
          </div>
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 h-7 rounded-full font-orbitron text-xs font-black grid place-items-center text-white ring-2 ring-[var(--bg-void)]"
            style={{
              background: "var(--gradient-monarch)",
              boxShadow: "0 0 14px var(--monarch)",
            }}
          >
            LV {stats.level}
          </div>
        </div>

        <div className="flex-1 min-w-0 text-center sm:text-left w-full">
          <div className="text-[11px] font-orbitron font-bold tracking-[0.22em] uppercase flex items-center gap-1.5 justify-center sm:justify-start text-amber-300">
            <Crown className="h-3 w-3" /> {identity.title || "Academy Hero"}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-0.5 truncate">{identity.name}</h2>
          <div className="text-sm text-muted-foreground font-orbitron">
            {identity.username ? `@${identity.username}` : "@cadet"}
            {identity.standardName ? ` · ${identity.standardName}` : ""}
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-[11px] font-orbitron tracking-wider mb-1.5">
              <span className="text-[var(--rune)]">
                <Zap className="inline h-3 w-3 mr-1" />
                XP {p.xpIntoLevel.toLocaleString()} / {p.xpForNextLevel.toLocaleString()}
              </span>
              <span className="text-muted-foreground">Level {stats.level}</span>
            </div>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden xp-bar-glow">
              <motion.div
                className="h-full"
                style={{ background: "var(--gradient-xp)" }}
                initial={{ width: 0 }}
                animate={{ width: `${p.progressPct}%` }}
                transition={{ duration: 0.9 }}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            <BannerStat
              icon={<Zap className="h-3.5 w-3.5 text-yellow-300" />}
              label="Total XP"
              value={stats.xp.toLocaleString()}
            />
            <BannerStat
              icon={<Coins className="h-3.5 w-3.5 text-amber-300" />}
              label="Coins"
              value={stats.coins.toLocaleString()}
            />
            <BannerStat
              icon={<Crown className="h-3.5 w-3.5 text-violet-300" />}
              label="Level"
              value={`${stats.level}`}
            />
          </div>
        </div>
      </div>

      <div className="relative mt-5">
        <AcademyRankCard xp={stats.xp} />
      </div>
    </motion.div>
  );
}

function BannerStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 flex items-center gap-2">
      {icon}
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground leading-none">
          {label}
        </div>
        <div className="text-sm font-orbitron font-bold leading-tight truncate">{value}</div>
      </div>
    </div>
  );
}
