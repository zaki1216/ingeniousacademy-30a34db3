/**
 * DailyMissions — 3–4 simple, age-appropriate goals for the day with
 * claimable XP / coin rewards. Data comes from the mission engine.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Check, Coins, Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { claimMissionReward } from "@/lib/api/learning.functions";
import { useDailyMissions } from "@/lib/learning/useContinueLearning";

export function DailyMissions({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { data, isLoading } = useDailyMissions();
  const qc = useQueryClient();
  const claimFn = useServerFn(claimMissionReward);

  const claim = useMutation({
    mutationFn: (code: string) => claimFn({ data: { code: code as never } }),
    onSuccess: (r) => {
      if (!r.alreadyClaimed) toast.success(`+${r.xp} XP · +${r.coins} coins`);
      qc.invalidateQueries({ queryKey: ["daily-missions"] });
      qc.invalidateQueries({ queryKey: ["gam-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message ?? "Could not claim reward"),
  });

  if (isLoading) {
    return <div className={cn("h-28 rounded-2xl border border-white/10 bg-black/40 animate-pulse", className)} />;
  }
  if (!data || data.missions.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-3 sm:p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className="text-[10px] uppercase tracking-[0.3em] font-bold text-amber-300"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          Today's Missions
        </div>
        <span className="text-[10px] font-bold text-amber-100/70">
          {data.completed}/{data.total} done
        </span>
      </div>

      <div className={cn("mt-2.5 grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
        {data.missions.map((m) => {
          const pct = Math.round((m.progress / m.target) * 100);
          const canClaim = m.complete && !m.claimed;
          return (
            <div
              key={m.code}
              className={cn(
                "rounded-xl border p-2.5 bg-black/40 flex items-center gap-2.5",
                canClaim ? "border-amber-400/60" : "border-white/10",
              )}
            >
              <span className="text-lg shrink-0">{m.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-amber-50 truncate">{m.label}</div>
                <div className="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6 }}
                    className={cn(
                      "h-full",
                      m.complete ? "bg-emerald-400" : "bg-gradient-to-r from-amber-300 to-orange-500",
                    )}
                  />
                </div>
                <div className="mt-1 flex items-center gap-2 text-[9px] text-amber-100/60">
                  <span>
                    {m.progress}/{m.target}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5 text-amber-300" />
                    {m.xp}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Coins className="h-2.5 w-2.5 text-yellow-300" />
                    {m.coins}
                  </span>
                </div>
              </div>
              {m.claimed ? (
                <span className="shrink-0 text-emerald-400" aria-label="Reward claimed">
                  <Check className="h-4 w-4" />
                </span>
              ) : (
                <button
                  disabled={!canClaim || claim.isPending}
                  onClick={() => claim.mutate(m.code)}
                  className={cn(
                    "shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-black tracking-wider transition",
                    canClaim
                      ? "bg-gradient-to-b from-amber-200 to-amber-500 text-amber-950 hover:brightness-110"
                      : "bg-white/5 text-amber-100/40 cursor-not-allowed",
                  )}
                >
                  {claim.isPending && claim.variables === m.code ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : canClaim ? (
                    "CLAIM"
                  ) : (
                    "TODO"
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
