import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { listAcademyRanks } from "@/lib/api/ranks.functions";
import { rankProgress } from "@/lib/rpg/academyRanks";
import { getIcon } from "@/lib/gamification/icons";
import { cn } from "@/lib/utils";

type Props = {
  xp: number;
  className?: string;
  variant?: "full" | "compact";
};

export function AcademyRankCard({ xp, className, variant = "full" }: Props) {
  const listFn = useServerFn(listAcademyRanks);
  const q = useQuery({
    queryKey: ["academy-ranks"],
    queryFn: () => listFn(),
    staleTime: 5 * 60_000,
  });

  const ranks = q.data ?? [];
  const p = rankProgress(xp, ranks);
  const rank = p.current;
  const Icon = rank ? getIcon(rank.icon) : null;

  if (!rank) {
    return (
      <div className={cn("rune-border holo-card p-4 text-sm text-muted-foreground", className)}>
        Loading Academy Rank…
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 border",
          className,
        )}
        style={{
          background: "rgba(0,0,0,0.5)",
          borderColor: `${rank.color}66`,
          boxShadow: `0 0 14px -4px ${rank.color}66`,
        }}
        title={`Academy Rank · ${rank.name}`}
      >
        <div
          className="h-6 w-6 rounded-md grid place-items-center text-white"
          style={{ background: rank.gradient }}
        >
          {Icon && <Icon className="h-3.5 w-3.5" />}
        </div>
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-widest leading-none" style={{ color: rank.color }}>
            Academy Rank
          </div>
          <div className="text-xs font-orbitron font-bold leading-tight truncate">{rank.name}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("rune-border holo-card relative overflow-hidden p-4 sm:p-5", className)}
      style={{ boxShadow: `0 0 40px -20px ${rank.color}` }}
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 20% 0%, ${rank.color}55, transparent 55%)`,
        }}
      />
      <div className="relative flex items-center gap-4">
        <div
          className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl grid place-items-center text-white shrink-0"
          style={{
            background: rank.gradient,
            boxShadow: `0 0 24px -4px ${rank.color}`,
          }}
        >
          {Icon && <Icon className="h-8 w-8 sm:h-10 sm:w-10" />}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="text-[10px] font-orbitron uppercase tracking-[0.3em]"
            style={{ color: rank.color }}
          >
            Academy Rank
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-orbitron leading-tight truncate">
            {rank.name}
          </div>
          {rank.message && (
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{rank.message}</div>
          )}
        </div>
      </div>

      <div className="relative mt-4">
        <div className="flex justify-between text-[11px] font-orbitron tracking-wider mb-1.5">
          <span className="text-muted-foreground">
            <Zap className="inline h-3 w-3 mr-1" />
            {xp.toLocaleString()} XP
          </span>
          {p.next ? (
            <span style={{ color: p.next.color }}>
              {p.xpForNext.toLocaleString()} XP → {p.next.name}
            </span>
          ) : (
            <span className="text-amber-300">Max Rank Achieved</span>
          )}
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full"
            style={{ background: rank.gradient }}
            initial={{ width: 0 }}
            animate={{ width: `${p.progressPct}%` }}
            transition={{ duration: 0.9 }}
          />
        </div>
      </div>
    </div>
  );
}
