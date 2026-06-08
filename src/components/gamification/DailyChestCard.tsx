import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Gift, Coins, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getChestStatus, claimDailyChest } from "@/lib/api/chest.functions";
import { chestRewardForDay } from "@/lib/gamification/chestRewards";
import { cn } from "@/lib/utils";

const RARITY_STYLES: Record<string, { ring: string; bg: string; text: string }> = {
  common: { ring: "ring-slate-400/40", bg: "from-slate-600 to-slate-800", text: "text-slate-200" },
  rare: { ring: "ring-sky-400/60", bg: "from-sky-500 to-indigo-700", text: "text-sky-100" },
  epic: { ring: "ring-fuchsia-400/70", bg: "from-fuchsia-500 to-purple-700", text: "text-fuchsia-100" },
  legendary: { ring: "ring-amber-300/80", bg: "from-amber-400 to-rose-600", text: "text-amber-100" },
};

export function DailyChestCard() {
  const qc = useQueryClient();
  const getStatus = useServerFn(getChestStatus);
  const claim = useServerFn(claimDailyChest);
  const status = useQuery({ queryKey: ["chest-status"], queryFn: () => getStatus() });
  const [opening, setOpening] = useState(false);
  const [result, setResult] = useState<{ coins: number; rarity: string; day: number; label: string } | null>(null);
  const firedRef = useRef(false);

  const claimedToday = status.data?.claimedToday;
  const day = status.data?.nextDay ?? 1;
  const reward = status.data?.nextReward ?? chestRewardForDay(1);
  const rarity = RARITY_STYLES[reward.rarity];

  async function handleClaim() {
    if (claimedToday || opening) return;
    setOpening(true);
    try {
      const r = await claim();
      if (!r.alreadyClaimed) {
        setResult({ coins: r.reward.coins, rarity: r.reward.rarity, day: r.day ?? day, label: r.reward.label });
        firedRef.current = false;
        qc.invalidateQueries({ queryKey: ["chest-status"] });
        qc.invalidateQueries({ queryKey: ["gam-dashboard"] });
      }
    } finally {
      setOpening(false);
    }
  }

  useEffect(() => {
    if (!result || firedRef.current) return;
    firedRef.current = true;
    confetti({
      particleCount: result.rarity === "legendary" ? 240 : result.rarity === "epic" ? 160 : 100,
      spread: 100,
      origin: { y: 0.55 },
      colors: ["#FBBF24", "#7C3AED", "#2563EB", "#22C55E", "#EF4444"],
    });
  }, [result]);

  return (
    <>
      <div className={cn(
        "relative overflow-hidden rounded-2xl p-4 glass-card",
        !claimedToday && "glow-gold",
      )}>
        <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_20%_30%,#FBBF24_0%,transparent_40%),radial-gradient(circle_at_80%_70%,#7C3AED_0%,transparent_40%)]" />
        <div className="relative flex items-center gap-4">
          <motion.button
            onClick={handleClaim}
            whileTap={{ scale: 0.92 }}
            whileHover={!claimedToday ? { y: -3 } : undefined}
            disabled={claimedToday || opening}
            className={cn(
              "relative h-20 w-20 rounded-2xl flex items-center justify-center shrink-0",
              "bg-gradient-to-br ring-2",
              rarity.bg,
              rarity.ring,
              !claimedToday && "animate-float",
              claimedToday && "opacity-50 grayscale",
            )}
          >
            <Gift className="h-10 w-10 text-white drop-shadow-lg" />
            {!claimedToday && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                !
              </span>
            )}
          </motion.button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Day {day} Reward
            </div>
            <div className="text-xl font-extrabold mt-0.5 capitalize">
              {reward.label}
            </div>
            <div className="flex items-center gap-1 mt-1 text-amber-300 font-bold">
              <Coins className="h-4 w-4" /> +{reward.coins} coins
            </div>
          </div>
          {!claimedToday ? (
            <Button onClick={handleClaim} disabled={opening} className="bg-[image:var(--gradient-gold)] text-amber-950 hover:opacity-90 font-bold shadow-lg">
              {opening ? "Opening…" : "Claim"}
            </Button>
          ) : (
            <span className="text-xs font-bold text-success uppercase">Claimed</span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setResult(null)}
          >
            <motion.div
              initial={{ scale: 0.6, rotate: -10, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 16 }}
              className="w-full max-w-sm bg-card border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={cn("relative p-8 text-center bg-gradient-to-br", RARITY_STYLES[result.rarity].bg)}>
                <button onClick={() => setResult(null)} className="absolute top-3 right-3 text-white/80 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
                <motion.div
                  initial={{ y: 20, rotate: -10 }}
                  animate={{ y: 0, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="mx-auto h-32 w-32 rounded-3xl bg-white/15 flex items-center justify-center mb-3 backdrop-blur-sm"
                >
                  <Gift className="h-20 w-20 text-white drop-shadow-2xl" />
                </motion.div>
                <div className="text-xs uppercase tracking-widest text-white/80 font-bold">
                  Day {result.day} · {result.rarity} chest
                </div>
                <div className="text-3xl font-extrabold text-white mt-1">{result.label}</div>
                <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white font-extrabold text-2xl">
                  <Coins className="h-6 w-6 text-amber-300" /> +{result.coins}
                </div>
              </div>
              <div className="p-4 flex justify-end">
                <Button onClick={() => setResult(null)} className="bg-[image:var(--gradient-primary)] font-bold">
                  Awesome!
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
