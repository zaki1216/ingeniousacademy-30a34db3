import { motion } from "framer-motion";
import { Coins, Flame, Trophy, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { levelProgress } from "@/lib/gamification/leveling";

export function GameStatsCard({
  xp, level, coins, streak, maxStreak,
}: {
  xp: number; level: number; coins: number; streak: number; maxStreak: number;
}) {
  const p = levelProgress(xp);
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="bg-[image:var(--gradient-primary)] text-primary-foreground p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xs opacity-90">Level</div>
                <div className="text-3xl font-extrabold leading-none">{level}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-90 flex items-center gap-1 justify-end">
                <Zap className="h-3.5 w-3.5" /> {xp} XP
              </div>
              <div className="text-xs opacity-80 mt-1">
                {p.xpIntoLevel} / {p.xpForNextLevel} to L{level + 1}
              </div>
            </div>
          </div>
          <div className="mt-3 h-2.5 rounded-full bg-white/20 overflow-hidden">
            <motion.div
              className="h-full bg-white"
              initial={{ width: 0 }}
              animate={{ width: `${p.progressPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x">
          <Stat icon={<Coins className="h-4 w-4 text-amber-500" />} label="Coins" value={coins} />
          <Stat icon={<Flame className="h-4 w-4 text-orange-500" />} label="Streak" value={`${streak}d`} />
          <Stat icon={<Flame className="h-4 w-4 text-rose-500" />} label="Best" value={`${maxStreak}d`} />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center justify-center py-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">{icon} {label}</div>
      <div className="font-bold text-lg leading-tight mt-0.5">{value}</div>
    </div>
  );
}
