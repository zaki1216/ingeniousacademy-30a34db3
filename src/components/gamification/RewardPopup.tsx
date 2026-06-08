import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Coins, Flame, Sparkles, Star, Trophy, X, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getIcon } from "@/lib/gamification/icons";

export type RewardPayload = {
  xpAwarded: number;
  coinsAwarded: number;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  newXp: number;
  newCoins: number;
  newAchievements: { code: string; name: string; description: string; icon: string }[];
  title?: string;
};

export function RewardPopup({
  reward,
  onClose,
}: {
  reward: RewardPayload | null;
  onClose: () => void;
}) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!reward) {
      firedRef.current = false;
      return;
    }
    if (firedRef.current) return;
    firedRef.current = true;
    if (reward.leveledUp || reward.newAchievements.length > 0) {
      confetti({
        particleCount: 140,
        spread: 90,
        origin: { y: 0.6 },
        colors: ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981"],
      });
    }
  }, [reward]);

  return (
    <AnimatePresence>
      {reward && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, scale: 0.92, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="w-full max-w-sm bg-card border rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-[image:var(--gradient-primary)] text-primary-foreground p-5">
              <button onClick={onClose} className="absolute top-3 right-3 opacity-80 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2 text-sm font-semibold opacity-90">
                <Sparkles className="h-4 w-4" /> {reward.title ?? "Reward earned!"}
              </div>
              <div className="mt-3 flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0.6, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 14 }}
                  className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center"
                >
                  <Zap className="h-7 w-7" />
                </motion.div>
                <div>
                  <div className="text-3xl font-extrabold leading-none">+{reward.xpAwarded} XP</div>
                  <div className="text-xs opacity-90 mt-1 flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5" /> +{reward.coinsAwarded} coins
                  </div>
                </div>
              </div>
            </div>

            {reward.leveledUp && (
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="px-5 py-4 border-b flex items-center gap-3 bg-accent/40"
              >
                <Trophy className="h-6 w-6 text-primary" />
                <div className="flex-1">
                  <div className="font-bold">Level Up!</div>
                  <div className="text-xs text-muted-foreground">
                    Level {reward.oldLevel} → <span className="font-bold text-primary">Level {reward.newLevel}</span>
                  </div>
                </div>
                <Star className="h-5 w-5 text-amber-500" />
              </motion.div>
            )}

            {reward.newAchievements.length > 0 && (
              <div className="px-5 py-4 space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  New badges
                </div>
                {reward.newAchievements.map((a, i) => {
                  const Icon = getIcon(a.icon);
                  return (
                    <motion.div
                      key={a.code}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.2 + i * 0.07 }}
                      className="flex items-center gap-3 rounded-lg border p-2.5 bg-card"
                    >
                      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{a.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{a.description}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <div className="p-3 border-t flex justify-end gap-2">
              <Button size="sm" onClick={onClose}>Awesome!</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function StreakBadge({ days }: { days: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2.5 py-1 text-xs font-semibold">
      <Flame className="h-3.5 w-3.5" /> {days}d streak
    </div>
  );
}
