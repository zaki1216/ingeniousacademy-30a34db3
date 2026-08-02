import {
  Award,
  BookOpen,
  CalendarCheck,
  Clock,
  Coins,
  Crown,
  Flame,
  Shield,
  Swords,
  Target,
  Zap,
} from "lucide-react";

import type { HeroStats } from "@/lib/hero/types";

/** Academy Statistics — the hero's lifetime numbers. */
export function AcademyStatistics({ stats }: { stats: HeroStats }) {
  const hours = Math.floor(stats.studyMinutes / 60);
  const mins = stats.studyMinutes % 60;
  const tiles = [
    { icon: <BookOpen className="h-5 w-5 text-cyan-300" />, label: "Lessons Completed", value: `${stats.lessonsCompleted}` },
    { icon: <Shield className="h-5 w-5 text-violet-300" />, label: "Dungeons Cleared", value: `${stats.dungeonsCleared}` },
    { icon: <Swords className="h-5 w-5 text-rose-300" />, label: "Master Trials Won", value: `${stats.masterTrialsWon}` },
    { icon: <Target className="h-5 w-5 text-emerald-300" />, label: "Missions Completed", value: `${stats.missionsCompleted}` },
    { icon: <Clock className="h-5 w-5 text-sky-300" />, label: "Study Time", value: hours ? `${hours}h ${mins}m` : `${mins}m` },
    { icon: <Flame className="h-5 w-5 text-orange-400" />, label: "Current Streak", value: `${stats.streakDays}d` },
    { icon: <CalendarCheck className="h-5 w-5 text-emerald-300" />, label: "Attendance", value: `${stats.attendancePct}%` },
    { icon: <Zap className="h-5 w-5 text-yellow-300" />, label: "XP Earned", value: stats.xpEarned.toLocaleString() },
    { icon: <Coins className="h-5 w-5 text-amber-300" />, label: "Coins Earned", value: stats.coinsEarned.toLocaleString() },
    { icon: <Crown className="h-5 w-5 text-amber-300" />, label: "Rank Promotions", value: `${stats.rankPromotions}` },
    { icon: <Award className="h-5 w-5 text-fuchsia-300" />, label: "Days in Academy", value: `${stats.daysInAcademy}` },
    { icon: <Flame className="h-5 w-5 text-red-400" />, label: "Best Streak", value: `${stats.maxStreak}d` },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
      {tiles.map((t) => (
        <div key={t.label} className="rune-border holo-card p-3 flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl grid place-items-center bg-white/5 border border-white/10">
            {t.icon}
          </div>
          <div className="min-w-0">
            <div className="text-lg font-extrabold font-orbitron leading-tight truncate">
              {t.value}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground leading-tight">
              {t.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
