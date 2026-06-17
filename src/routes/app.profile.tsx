import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  Award, BookOpen, CalendarCheck, Coins, Flame, Sparkles, Swords, Trophy, Zap, ChevronRight,
} from "lucide-react";

import { useAuth } from "@/lib/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getGamificationDashboard } from "@/lib/api/gamification.functions";
import { levelProgress } from "@/lib/gamification/leveling";
import { rankFromLevel, nextRank } from "@/lib/rpg/ranks";
import { RankBadge } from "@/components/rpg/RankBadge";

export const Route = createFileRoute("/app/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user } = useAuth();
  const getDash = useServerFn(getGamificationDashboard);

  const dash = useQuery({
    queryKey: ["gam-dashboard", user?.id],
    enabled: !!user?.id,
    queryFn: () => getDash(),
  });

  const profile = useQuery({
    queryKey: ["profile-cosmetics", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase
        .from("profiles")
        .select("name, equipped_avatar, equipped_frame, equipped_title")
        .eq("id", user!.id)
        .maybeSingle()).data,
  });

  const counts = useQuery({
    queryKey: ["profile-counts", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [vc, results, ach, att, arenaW] = await Promise.all([
        supabase.from("video_completions").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("results").select("id, percentage, test:tests(is_boss)").eq("student_id", user!.id),
        supabase.from("user_achievements").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("attendance").select("status").eq("student_id", user!.id),
        supabase.from("pvp_duels").select("id, winner_id").or(`challenger_id.eq.${user!.id},opponent_id.eq.${user!.id}`),
      ]);
      const resultRows = (results.data ?? []) as { percentage: number; test: { is_boss: boolean } | null }[];
      const attRows = (att.data ?? []) as { status: string }[];
      const present = attRows.filter((r) => r.status === "present").length;
      const total = attRows.length;
      const arenaRows = (arenaW.data ?? []) as { winner_id: string | null }[];
      const wins = arenaRows.filter((r) => r.winner_id === user!.id).length;
      return {
        lectures: vc.count ?? 0,
        quizzes: resultRows.length,
        bossesDefeated: resultRows.filter((r) => r.test?.is_boss).length,
        achievements: ach.count ?? 0,
        attendancePct: total > 0 ? Math.round((present / total) * 100) : 0,
        arenaWins: wins,
      };
    },
  });

  const stats = dash.data?.stats;
  const rank = stats ? rankFromLevel(stats.level) : null;
  const next = stats ? nextRank(stats.level) : null;
  const p = stats ? levelProgress(stats.xp) : null;
  const avatar = profile.data?.equipped_avatar || "🧑‍🎓";
  const title = profile.data?.equipped_title || rank?.label || "Hunter";
  const frameStyle = profile.data?.equipped_frame
    ? { background: profile.data.equipped_frame as string }
    : { background: rank?.gradient ?? "var(--gradient-monarch)" };

  return (
    <div className="space-y-5">
      {/* Hero player card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rune-border holo-card monarch-glow relative overflow-hidden p-5"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(circle at 20% -10%, color-mix(in oklab, var(--monarch) 40%, transparent), transparent 55%), radial-gradient(circle at 90% 110%, color-mix(in oklab, var(--rune) 35%, transparent), transparent 50%)",
          }}
        />
        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-3xl"
              animate={{ rotate: 360 }}
              transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
              style={{
                background: "conic-gradient(from 0deg, var(--monarch) 0%, transparent 25%, var(--rune) 50%, transparent 75%, var(--monarch) 100%)",
                filter: "blur(14px)",
                opacity: 0.55,
              }}
            />
            <div
              className="relative h-28 w-28 rounded-3xl p-[3px]"
              style={frameStyle}
            >
              <div className="h-full w-full rounded-[20px] bg-[var(--bg-void)] grid place-items-center text-6xl">
                {avatar}
              </div>
            </div>
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 h-7 rounded-full font-orbitron text-xs font-black grid place-items-center text-white ring-2 ring-[var(--bg-void)]"
              style={{ background: rank?.gradient ?? "var(--gradient-monarch)", boxShadow: `0 0 14px ${rank?.glow ?? "var(--monarch)"}` }}
            >
              LV {stats?.level ?? "—"}
            </div>
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div
              className="text-[11px] font-orbitron font-bold tracking-[0.22em] uppercase"
              style={{ color: rank?.color }}
            >
              {title}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-0.5">
              {profile.data?.name || "Hunter"}
            </h1>
            {rank && (
              <div className="mt-2 inline-flex">
                <RankBadge rank={rank} size="md" showLabel />
              </div>
            )}

            {p && (
              <div className="mt-4">
                <div className="flex justify-between text-[11px] font-orbitron tracking-wider mb-1.5">
                  <span className="text-[var(--rune)]">
                    <Zap className="inline h-3 w-3 mr-1" />
                    XP {p.xpIntoLevel.toLocaleString()} / {p.xpForNextLevel.toLocaleString()}
                  </span>
                  {next?.next && (
                    <span className="text-muted-foreground">
                      {next.levelsAway} LV → {next.next.label}
                    </span>
                  )}
                </div>
                <div className="h-3 rounded-full bg-white/10 overflow-hidden xp-bar-glow">
                  <motion.div
                    className="h-full relative"
                    style={{ background: "var(--gradient-xp)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${p.progressPct}%` }}
                    transition={{ duration: 0.9 }}
                  >
                    <div className="absolute inset-0 animate-shimmer-sweep bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  </motion.div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Quick stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatTile icon={<Coins className="h-5 w-5 text-amber-300" />} label="Coins" value={(stats?.coins ?? 0).toLocaleString()} />
        <StatTile icon={<Flame className="h-5 w-5 text-orange-400" />} label="Streak" value={`${stats?.streak_days ?? 0} days`} />
        <StatTile icon={<Trophy className="h-5 w-5 text-yellow-300" />} label="Max Streak" value={`${stats?.max_streak ?? 0}`} />
        <StatTile icon={<BookOpen className="h-5 w-5 text-cyan-300" />} label="Lectures" value={`${counts.data?.lectures ?? 0}`} />
        <StatTile icon={<Swords className="h-5 w-5 text-rose-400" />} label="Quizzes" value={`${counts.data?.quizzes ?? 0}`} />
        <StatTile icon={<Sparkles className="h-5 w-5 text-violet-300" />} label="Bosses Defeated" value={`${counts.data?.bossesDefeated ?? 0}`} />
        <StatTile icon={<Award className="h-5 w-5 text-emerald-300" />} label="Badges" value={`${counts.data?.achievements ?? 0}`} />
        <StatTile icon={<Swords className="h-5 w-5 text-fuchsia-300" />} label="Arena Wins" value={`${counts.data?.arenaWins ?? 0}`} />
        <StatTile icon={<CalendarCheck className="h-5 w-5 text-green-300" />} label="Attendance" value={`${counts.data?.attendancePct ?? 0}%`} />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickLink to="/app/achievements" icon={<Award className="h-4 w-4" />} label="Badges" />
        <QuickLink to="/app/talents" icon={<Sparkles className="h-4 w-4" />} label="Skill Tree" />
        <QuickLink to="/app/shop" icon={<Coins className="h-4 w-4" />} label="Cosmetics" />
        <QuickLink to="/app/leaderboard" icon={<Trophy className="h-4 w-4" />} label="Ranking" />
      </div>
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rune-border holo-card p-3 flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl grid place-items-center bg-white/5 border border-white/10">{icon}</div>
      <div className="min-w-0">
        <div className="text-lg font-extrabold font-orbitron leading-tight">{value}</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="rune-border holo-card flex items-center justify-between p-3 hover:monarch-glow transition-all"
    >
      <span className="flex items-center gap-2 text-sm font-bold">
        {icon} {label}
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
