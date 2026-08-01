/**
 * AdventureProgressPanel — the header shown above every Adventure Map.
 * Purely presentational: reads existing gamification + rank queries.
 */

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Coins, Sparkles, Swords, Target } from "lucide-react";

import { listAcademyRanks } from "@/lib/api/ranks.functions";
import { rankProgress } from "@/lib/rpg/academyRanks";
import { getIcon } from "@/lib/gamification/icons";
import { ADVENTURE_TERMS } from "@/lib/adventure/terminology";
import { cn } from "@/lib/utils";

export function AdventureProgressPanel({
  dungeonName,
  dungeonNumber,
  completed,
  total,
  xpEarned,
  coinsEarned,
  xp,
  className,
}: {
  dungeonName: string;
  dungeonNumber?: number | string;
  completed: number;
  total: number;
  xpEarned: number;
  coinsEarned: number;
  /** Total lifetime XP — used for Academy Rank */
  xp: number;
  className?: string;
}) {
  const listFn = useServerFn(listAcademyRanks);
  const ranksQ = useQuery({
    queryKey: ["academy-ranks"],
    queryFn: () => listFn(),
    staleTime: 5 * 60_000,
  });

  const p = rankProgress(xp, ranksQ.data ?? []);
  const RankIcon = p.current ? getIcon(p.current.icon) : null;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = Math.max(0, total - completed);

  return (
    <div
      className={cn("rounded-2xl border border-amber-400/25 p-3 sm:p-4", className)}
      style={{
        background: "linear-gradient(135deg, rgba(25,12,0,0.85), rgba(8,4,20,0.8))",
        boxShadow: "0 24px 60px -40px rgba(251,191,36,0.6)",
      }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300 font-bold">
            {ADVENTURE_TERMS.dungeon} {dungeonNumber ?? ""}
          </div>
          <h1
            className="text-xl sm:text-2xl font-black text-amber-50 leading-tight"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            {dungeonName}
          </h1>
        </div>

        {p.current && (
          <div
            className="shrink-0 rounded-xl border px-2.5 py-1.5 min-w-[9.5rem]"
            style={{
              borderColor: `${p.current.color}55`,
              background: "rgba(0,0,0,0.45)",
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded-md grid place-items-center text-white"
                style={{ background: p.current.gradient }}
              >
                {RankIcon && <RankIcon className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0">
                <div className="text-[9px] uppercase tracking-widest" style={{ color: p.current.color }}>
                  Academy Rank
                </div>
                <div className="text-xs font-bold text-amber-50 truncate">{p.current.name}</div>
              </div>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-black/60 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${p.progressPct}%`, background: p.current.gradient }}
              />
            </div>
            <div className="mt-0.5 text-[9px] text-amber-100/60">
              {p.next ? `${p.xpForNext} XP to ${p.next.name}` : "Highest rank reached"}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-[11px] font-semibold text-amber-100/80">
          <span>
            {completed} / {total} {ADVENTURE_TERMS.quest}s cleared
          </span>
          <span>{percent}%</span>
        </div>
        <div className="mt-1 h-2 rounded-full bg-black/60 overflow-hidden border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-amber-300 to-orange-500 transition-all duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <Stat icon={<Swords className="h-3.5 w-3.5" />} label="Cleared" value={completed} />
        <Stat icon={<Target className="h-3.5 w-3.5" />} label="Remaining" value={remaining} />
        <Stat icon={<Sparkles className="h-3.5 w-3.5" />} label="XP earned" value={xpEarned} />
        <Stat icon={<Coins className="h-3.5 w-3.5" />} label="Coins earned" value={coinsEarned} />
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5">
      <div className="flex items-center gap-1 text-amber-300/80 text-[9px] uppercase tracking-widest">
        {icon} {label}
      </div>
      <div className="font-black text-amber-50 text-sm">{value}</div>
    </div>
  );
}
