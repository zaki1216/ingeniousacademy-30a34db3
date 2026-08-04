import { motion } from "framer-motion";

import type { DormAchievement } from "@/lib/dorm/config";
import { cn } from "@/lib/utils";

/** Achievement Wall — unlocked achievements glow, locked ones stay silhouettes. */
export function AchievementWall({ achievements }: { achievements: DormAchievement[] }) {
  const unlocked = achievements.filter((a) => a.unlocked).length;
  return (
    <div className="rune-border holo-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-orbitron font-bold tracking-[0.2em] uppercase text-violet-300">
          Achievement Wall
        </div>
        <div className="text-[11px] text-muted-foreground">
          {unlocked}/{achievements.length}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
        {achievements.map((a, i) => (
          <motion.div
            key={a.code}
            initial={a.unlocked ? { scale: 0.85, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: Math.min(i * 0.03, 0.5) }}
            title={`${a.name} — ${a.description}`}
            className={cn(
              "aspect-square rounded-xl grid place-items-center text-xl border",
              a.unlocked
                ? "bg-white/8 border-white/20 shadow-[0_0_16px_-6px_rgba(251,191,36,0.7)]"
                : "bg-black/40 border-white/5",
            )}
          >
            <span className={cn(!a.unlocked && "opacity-25 grayscale contrast-0")}>{a.icon}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
