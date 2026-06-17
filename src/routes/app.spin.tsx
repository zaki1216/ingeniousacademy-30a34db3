import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Sparkles, Flame, Gift, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getSpinStatus, doSpin } from "@/lib/api/spin.functions";
import type { SpinPrize } from "@/lib/rpg/spin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/spin")({ component: SpinPage });

const RARITY_RING: Record<string, string> = {
  common: "ring-slate-400/40",
  rare: "ring-sky-400/60",
  epic: "ring-fuchsia-400/70",
  legendary: "ring-amber-300/80 shadow-[0_0_24px_rgba(251,191,36,0.45)]",
};

function SpinPage() {
  const qc = useQueryClient();
  const getStatus = useServerFn(getSpinStatus);
  const spin = useServerFn(doSpin);
  const status = useQuery({ queryKey: ["spin-status"], queryFn: () => getStatus() });

  const prizes: SpinPrize[] = useMemo(() => status.data?.prizes ?? [], [status.data]);
  const slice = prizes.length ? 360 / prizes.length : 0;
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinPrize | null>(null);

  // restore final rotation so the wheel doesn't snap on refresh after a win
  useEffect(() => {
    if (status.data?.spunToday && prizes.length) {
      const last = status.data.lastSpin;
      const idx = prizes.findIndex((p) => p.label === last?.prize_label);
      if (idx >= 0) setRotation(-(idx * slice));
    }
  }, [status.data, prizes, slice]);

  async function handleSpin() {
    if (spinning || status.data?.spunToday) return;
    setSpinning(true);
    setResult(null);
    try {
      const res = await spin();
      if (res.alreadyClaimed) {
        toast.error("You already spun today. Come back tomorrow!");
        await qc.invalidateQueries({ queryKey: ["spin-status"] });
        return;
      }
      const prize = res.prize!;
      const idx = prizes.findIndex((p) => p.id === prize.id);
      const turns = 6; // full rotations
      const target = -(turns * 360 + idx * slice);
      setRotation(target);
      // wait for animation
      setTimeout(async () => {
        setResult(prize);
        toast.success(`You won ${prize.label}!`);
        await qc.invalidateQueries({ queryKey: ["spin-status"] });
        await qc.invalidateQueries({ queryKey: ["gam-dashboard"] });
        await qc.invalidateQueries({ queryKey: ["shop"] });
        setSpinning(false);
      }, 4200);
    } catch (e) {
      toast.error((e as Error).message);
      setSpinning(false);
    }
  }

  const conic = useMemo(() => {
    if (!prizes.length) return "conic-gradient(#334155,#334155)";
    const parts: string[] = [];
    prizes.forEach((p, i) => {
      const a = i * slice;
      const b = (i + 1) * slice;
      parts.push(`${p.color} ${a}deg ${b}deg`);
    });
    return `conic-gradient(from -90deg, ${parts.join(",")})`;
  }, [prizes, slice]);

  const spunToday = status.data?.spunToday;
  const streak = status.data?.lastSpin?.streak ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-fuchsia-300 font-bold">Daily Reward</div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Gift className="h-6 w-6 text-fuchsia-400" /> Fortune Wheel
          </h1>
          <p className="text-xs text-muted-foreground mt-1">One free spin every day. Build a streak, win bigger.</p>
        </div>
        {streak > 0 && (
          <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 text-white px-3 py-1.5 flex items-center gap-1 font-extrabold text-sm shadow-lg">
            <Flame className="h-4 w-4" /> {streak}d
          </div>
        )}
      </div>

      {/* WHEEL */}
      <div className="relative mx-auto w-full max-w-[360px] aspect-square">
        {/* pointer */}
        <div className="absolute left-1/2 -top-1 -translate-x-1/2 z-20">
          <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[22px] border-l-transparent border-r-transparent border-t-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
        </div>

        <motion.div
          ref={wheelRef}
          className="absolute inset-0 rounded-full ring-4 ring-amber-300/70 shadow-[0_0_60px_rgba(251,191,36,0.35)]"
          style={{ background: conic }}
          animate={{ rotate: rotation }}
          transition={{ duration: spinning ? 4 : 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {prizes.map((p, i) => {
            const angle = i * slice + slice / 2;
            return (
              <div
                key={p.id}
                className="absolute left-1/2 top-1/2 origin-bottom"
                style={{
                  transform: `translate(-50%, -100%) rotate(${angle}deg)`,
                  height: "50%",
                }}
              >
                <div className="flex flex-col items-center pt-3 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
                  <span className="text-2xl">{p.icon}</span>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider mt-1 whitespace-nowrap">
                    {p.label.length > 12 ? p.label.slice(0, 12) + "…" : p.label}
                  </span>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* hub */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <button
            onClick={handleSpin}
            disabled={spinning || spunToday}
            className={cn(
              "h-24 w-24 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 font-extrabold text-sm flex flex-col items-center justify-center ring-4 ring-amber-200/80 shadow-[0_0_30px_rgba(251,191,36,0.7)] active:scale-95 transition-all",
              (spinning || spunToday) && "opacity-60 cursor-not-allowed",
            )}
          >
            {spunToday ? <Lock className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
            <span className="mt-0.5">{spinning ? "..." : spunToday ? "DONE" : "SPIN"}</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "mx-auto max-w-sm rounded-2xl glass-card p-4 text-center ring-2",
              RARITY_RING[result.rarity],
            )}
          >
            <div className="text-5xl">{result.icon}</div>
            <div className="mt-2 text-xs uppercase tracking-widest text-fuchsia-300 font-bold">{result.rarity}</div>
            <div className="text-lg font-extrabold">{result.label}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {spunToday && !result && status.data?.lastSpin && (
        <div className="mx-auto max-w-sm rounded-2xl glass-card p-3 text-center">
          <div className="text-xs text-muted-foreground">Today you won</div>
          <div className="text-base font-extrabold">{status.data.lastSpin.prize_label}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Next spin unlocks at 00:00 UTC.</div>
        </div>
      )}

      {/* PRIZES */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2">Possible rewards</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {prizes.map((p) => (
            <div key={p.id} className={cn("rounded-xl glass-card p-2 flex items-center gap-2 ring-1", RARITY_RING[p.rarity])}>
              <span className="text-xl">{p.icon}</span>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">{p.label}</div>
                <div className="text-[9px] uppercase text-muted-foreground">{p.rarity}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HISTORY */}
      {(status.data?.history?.length ?? 0) > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2">Recent spins</div>
          <div className="space-y-1.5">
            {status.data!.history.slice(0, 10).map((h) => (
              <div key={h.id} className="flex items-center justify-between text-xs rounded-lg bg-card/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{h.prize_label}</span>
                  <span className="text-[9px] uppercase text-muted-foreground">{h.rarity}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  {h.reward_type === "coins" && (
                    <span className="flex items-center gap-1 text-amber-300 font-bold">
                      <Coins className="h-3 w-3" /> +{h.reward_amount}
                    </span>
                  )}
                  <span className="tabular-nums">{new Date(h.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
