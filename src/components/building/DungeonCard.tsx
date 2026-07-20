/**
 * Simple, reusable dungeon tile — used by the "simple" building variant
 * (Science labs, Language halls, and any future config-driven building
 * that opts into that variant).
 */
import { motion } from "framer-motion";
import { ChevronRight, Lock, Coins, Star, Crown } from "lucide-react";

import type { AccentTheme } from "@/lib/curriculum/types";

export interface DungeonCardData {
  id: string;
  name: string;
  number: number;
  total: number;
  passed: number;
  pct: number;
  bossCleared: boolean;
  unlocked: boolean;
  rewardXp: number;
  rewardCoins: number;
}

const ACCENTS: Record<AccentTheme, { bg: string; glow: string; txt: string }> = {
  emerald: { bg: "from-emerald-500 to-teal-800", glow: "rgba(52,211,153,0.5)", txt: "text-emerald-200" },
  amber: { bg: "from-amber-500 to-orange-800", glow: "rgba(251,191,36,0.5)", txt: "text-amber-200" },
  sky: { bg: "from-sky-500 to-indigo-800", glow: "rgba(56,189,248,0.5)", txt: "text-sky-200" },
};

export function DungeonCard({
  d,
  index,
  onEnter,
  accent,
}: {
  d: DungeonCardData;
  index: number;
  onEnter: () => void;
  accent: AccentTheme;
}) {
  const locked = !d.unlocked;
  const a = ACCENTS[accent];
  return (
    <motion.button
      type="button"
      disabled={locked}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={locked ? {} : { y: -3, scale: 1.02 }}
      onClick={onEnter}
      className="text-left rounded-2xl overflow-hidden border border-white/10 disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: "linear-gradient(160deg, rgba(15,25,20,0.9), rgba(5,10,8,0.95))",
        boxShadow: `0 15px 40px -15px ${a.glow}`,
      }}
    >
      <div className={`h-24 sm:h-28 bg-gradient-to-br ${a.bg} grid place-items-center relative`}>
        <div className="text-3xl sm:text-4xl font-black text-white/90 font-serif" style={{ textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
          {String(d.number).padStart(2, "0")}
        </div>
        {d.bossCleared && (
          <div className="absolute top-2 right-2 h-6 px-2 rounded-full bg-black/40 border border-white/30 flex items-center gap-1 text-[9px] font-black text-white">
            <Crown className="h-3 w-3" /> CLEARED
          </div>
        )}
        {locked && (
          <div className="absolute inset-0 bg-black/60 grid place-items-center">
            <Lock className="h-6 w-6 text-white/80" />
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <div className={`text-[9px] uppercase tracking-widest font-bold ${a.txt}`}>Dungeon {String(d.number).padStart(2, "0")}</div>
        <div className="font-serif text-base sm:text-lg font-black text-white truncate mt-0.5">{d.name}</div>
        <div className="mt-2 h-1.5 rounded-full bg-black/50 overflow-hidden">
          <div className={`h-full bg-gradient-to-r ${a.bg}`} style={{ width: `${d.pct}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-white/80">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1"><Coins className="h-3 w-3" /> {d.rewardCoins}</span>
            <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" /> {d.rewardXp}</span>
          </div>
          <span className={`inline-flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider ${a.txt}`}>
            {locked ? "Sealed" : "Enter"} <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </motion.button>
  );
}
