import { AnimatePresence, motion } from "framer-motion";
import { Coins, Zap } from "lucide-react";
import { useEffect, useState } from "react";

export type FloatingRewardPayload = {
  xp?: number;
  coins?: number;
  label?: string;
  key?: number;
};

/**
 * Lightweight floating XP/coin tokens that rise from the bottom of the
 * viewport. Pair with the full RewardPopup for big celebrations — this is
 * the quick "+50 XP" / "+10 coins" feedback for any reward-earning event.
 */
export function FloatingReward({ reward }: { reward: FloatingRewardPayload | null }) {
  const [items, setItems] = useState<(FloatingRewardPayload & { id: number })[]>([]);

  useEffect(() => {
    if (!reward) return;
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { ...reward, id }]);
    const t = setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 1800);
    return () => clearTimeout(t);
  }, [reward?.key, reward?.xp, reward?.coins, reward?.label]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 30, scale: 0.85 }}
            animate={{ opacity: 1, y: -40, scale: 1 }}
            exit={{ opacity: 0, y: -90, scale: 0.9 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
            className="flex items-center gap-2 rounded-full border border-primary/40 bg-background/90 px-4 py-2 backdrop-blur shadow-[0_0_24px_-6px_hsl(var(--primary)/0.7)]"
          >
            {item.xp ? (
              <span className="flex items-center gap-1 font-orbitron text-sm font-extrabold text-amber-400">
                <Zap className="h-4 w-4" /> +{item.xp} XP
              </span>
            ) : null}
            {item.coins ? (
              <span className="flex items-center gap-1 font-orbitron text-sm font-extrabold text-yellow-300">
                <Coins className="h-4 w-4" /> +{item.coins}
              </span>
            ) : null}
            {item.label ? (
              <span className="text-xs font-semibold text-muted-foreground">{item.label}</span>
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
