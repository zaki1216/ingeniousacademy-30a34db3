import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Coins, Flame, Zap } from "lucide-react";
import { motion } from "framer-motion";

import { useAuth } from "@/lib/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getGamificationDashboard } from "@/lib/api/gamification.functions";
import { levelProgress } from "@/lib/gamification/leveling";
import { rankFromLevel } from "@/lib/rpg/ranks";
import { RankBadge } from "./RankBadge";
import { cn } from "@/lib/utils";

export function PlayerStatusBar() {
  const { user } = useAuth();
  const getDash = useServerFn(getGamificationDashboard);

  const dash = useQuery({
    queryKey: ["gam-dashboard", user?.id],
    enabled: !!user?.id,
    queryFn: () => getDash(),
    staleTime: 30_000,
  });

  const profile = useQuery({
    queryKey: ["profile-cosmetics", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (
        await supabase
          .from("profiles")
          .select("name, equipped_avatar, equipped_frame, equipped_title")
          .eq("id", user!.id)
          .maybeSingle()
      ).data,
    staleTime: 60_000,
  });

  const stats = dash.data?.stats;
  if (!stats) return null;

  const p = levelProgress(stats.xp);
  const rank = rankFromLevel(stats.level);
  const avatar = profile.data?.equipped_avatar || "🧑‍🎓";
  const title = profile.data?.equipped_title || rank.label;
  const frameStyle = profile.data?.equipped_frame
    ? { background: profile.data.equipped_frame as string }
    : { background: rank.gradient };

  return (
    <div className="rune-border holo-card relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 15% -20%, color-mix(in oklab, var(--monarch) 35%, transparent), transparent 55%), radial-gradient(circle at 90% 120%, color-mix(in oklab, var(--rune) 30%, transparent), transparent 50%)",
        }}
      />
      <div className="relative px-3 py-2.5 flex items-center gap-3">
        <Link to="/app/profile" className="flex items-center gap-2.5 min-w-0 shrink-0 group">
          <div className="relative shrink-0">
            <div
              className="h-11 w-11 rounded-xl p-[2px] transition-transform group-hover:scale-105"
              style={frameStyle}
            >
              <div className="h-full w-full rounded-[10px] bg-[var(--bg-void)] grid place-items-center text-2xl">
                {avatar}
              </div>
            </div>
            <div
              className="absolute -bottom-1 -right-1 h-5 min-w-5 px-1 rounded-md font-orbitron text-[10px] font-black grid place-items-center text-white ring-2 ring-[var(--bg-void)]"
              style={{ background: rank.gradient, boxShadow: `0 0 10px ${rank.glow}` }}
            >
              {stats.level}
            </div>
          </div>
          <div className="hidden sm:block min-w-0">
            <div
              className="text-[9px] font-orbitron font-bold tracking-[0.18em] uppercase truncate"
              style={{ color: rank.color }}
            >
              {title}
            </div>
            <div className="text-sm font-extrabold leading-tight truncate">
              {profile.data?.name || "Hunter"}
            </div>
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-[10px] font-orbitron font-bold tracking-wider mb-1">
            <span className="flex items-center gap-1 text-[var(--rune)]">
              <Zap className="h-3 w-3" /> XP {p.xpIntoLevel}/{p.xpForNextLevel}
            </span>
            <span className="text-muted-foreground hidden sm:inline">
              LV {stats.level} → {Math.min(100, stats.level + 1)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden xp-bar-glow">
            <motion.div
              className="h-full relative"
              style={{ background: "var(--gradient-xp)" }}
              initial={{ width: 0 }}
              animate={{ width: `${p.progressPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="absolute inset-0 animate-shimmer-sweep bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            </motion.div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <RankBadge rank={rank} size="sm" />
          <StatChip
            icon={<Coins className="h-3.5 w-3.5 text-amber-300" />}
            value={stats.coins.toLocaleString()}
            color="amber"
          />
          <StatChip
            icon={<Flame className="h-3.5 w-3.5 text-orange-400" />}
            value={`${stats.streak_days}`}
            color="orange"
          />
        </div>
      </div>
    </div>
  );
}

function StatChip({
  icon,
  value,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  color: "amber" | "orange";
}) {
  return (
    <div
      className={cn(
        "h-7 px-2 rounded-lg flex items-center gap-1 bg-white/5 border border-white/10",
        "text-xs font-orbitron font-bold",
      )}
      style={{
        boxShadow: `inset 0 0 8px color-mix(in oklab, ${
          color === "amber" ? "#fbbf24" : "#fb923c"
        } 20%, transparent)`,
      }}
    >
      {icon}
      <span>{value}</span>
    </div>
  );
}
