import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  Award, BookOpen, CalendarCheck, Coins, Flame, Sparkles, Zap, GraduationCap,
  Home, Settings, Crown, Scroll,
} from "lucide-react";

import { useAuth } from "@/lib/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getGamificationDashboard } from "@/lib/api/gamification.functions";
import { levelProgress } from "@/lib/gamification/leveling";
import { rankFromLevel, nextRank } from "@/lib/rpg/ranks";
import { RankBadge } from "@/components/rpg/RankBadge";
import { DailyChestCard } from "@/components/gamification/DailyChestCard";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "Residence — Ingenious Academy" },
      { name: "description", content: "Your personal Academy Residence — hero card, progress and daily rewards." },
    ],
  }),
  component: ResidencePage,
});

function ResidencePage() {
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
      const [vc, ach, att] = await Promise.all([
        supabase.from("video_completions").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("user_achievements").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("attendance").select("status").eq("student_id", user!.id),
      ]);
      const attRows = (att.data ?? []) as { status: string }[];
      const present = attRows.filter((r) => r.status === "present").length;
      const total = attRows.length;
      return {
        lectures: vc.count ?? 0,
        achievements: ach.count ?? 0,
        attendancePct: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    },
  });

  const stats = dash.data?.stats;
  const rank = stats ? rankFromLevel(stats.level) : null;
  const next = stats ? nextRank(stats.level) : null;
  const p = stats ? levelProgress(stats.xp) : null;
  const avatar = profile.data?.equipped_avatar || "🧑‍🎓";
  const title = profile.data?.equipped_title || rank?.label || "Cadet";
  const frameStyle = profile.data?.equipped_frame
    ? { background: profile.data.equipped_frame as string }
    : { background: rank?.gradient ?? "var(--gradient-monarch)" };

  return (
    <div className="relative">
      <ResidenceAmbience />

      <div className="relative space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="h-11 w-11 rounded-2xl grid place-items-center text-2xl"
              style={{
                background: "linear-gradient(135deg, color-mix(in oklab, var(--monarch) 30%, transparent), color-mix(in oklab, var(--rune) 20%, transparent))",
                boxShadow: "0 0 24px color-mix(in oklab, var(--monarch) 30%, transparent)",
              }}
            >
              <Home className="h-5 w-5 text-white/90" />
            </div>
            <div>
              <div className="text-[10px] font-orbitron uppercase tracking-[0.28em] text-[var(--rune)]">
                Your Residence
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                Academy Residence
              </h1>
            </div>
          </div>
          <Link
            to="/app/settings"
            className="rune-border holo-card px-3 py-2 text-xs font-bold flex items-center gap-2 hover:monarch-glow transition-all"
          >
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </div>

        {/* Player Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rune-border holo-card monarch-glow relative overflow-hidden p-5"
        >
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative">
              <div className="relative h-28 w-28 rounded-3xl p-[3px]" style={frameStyle}>
                <div className="h-full w-full rounded-[20px] bg-[var(--bg-void)] grid place-items-center text-6xl">
                  {avatar}
                </div>
              </div>
              <div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 h-7 rounded-full font-orbitron text-xs font-black grid place-items-center text-white ring-2 ring-[var(--bg-void)]"
                style={{
                  background: rank?.gradient ?? "var(--gradient-monarch)",
                  boxShadow: `0 0 14px ${rank?.glow ?? "var(--monarch)"}`,
                }}
              >
                LV {stats?.level ?? "—"}
              </div>
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div
                className="text-[11px] font-orbitron font-bold tracking-[0.22em] uppercase flex items-center gap-1.5 justify-center sm:justify-start"
                style={{ color: rank?.color }}
              >
                <Crown className="h-3 w-3" /> {title}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold mt-0.5">
                {profile.data?.name || "Cadet"}
              </h2>
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
                      className="h-full"
                      style={{ background: "var(--gradient-xp)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${p.progressPct}%` }}
                      transition={{ duration: 0.9 }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <MiniStat icon={<Coins className="h-3.5 w-3.5 text-amber-300" />} label="Coins" value={(stats?.coins ?? 0).toLocaleString()} />
                <MiniStat icon={<Flame className="h-3.5 w-3.5 text-orange-400" />} label="Streak" value={`${stats?.streak_days ?? 0}d`} />
                <MiniStat icon={<CalendarCheck className="h-3.5 w-3.5 text-emerald-300" />} label="Attend." value={`${counts.data?.attendancePct ?? 0}%`} />
                <MiniStat icon={<Award className="h-3.5 w-3.5 text-violet-300" />} label="Badges" value={`${counts.data?.achievements ?? 0}`} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Daily Reward */}
        <div className="grid grid-cols-1 gap-4">
          <DailyChestCard />
        </div>

        {/* Quick actions */}
        <section>
          <div className="mb-3 px-1">
            <div className="text-[10px] font-orbitron uppercase tracking-[0.28em] text-[var(--rune)]">
              Quick actions
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold">Continue your Journey</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <QuickLink to="/app" icon={<Home className="h-4 w-4" />} label="Academy" />
            <QuickLink to="/app/journey" icon={<Sparkles className="h-4 w-4" />} label="Adventure" />
            <QuickLink to="/app/progress" icon={<GraduationCap className="h-4 w-4" />} label="Progress" />
            <QuickLink to="/app/content" icon={<BookOpen className="h-4 w-4" />} label="Lessons" />
          </div>
        </section>

        {/* Hunter Statistics */}
        <section>
          <div className="mb-3 px-1">
            <div className="text-[10px] font-orbitron uppercase tracking-[0.28em] text-[var(--rune)]">
              Chronicles
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold">Cadet Statistics</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile icon={<CalendarCheck className="h-5 w-5 text-emerald-300" />} label="Attendance" value={`${counts.data?.attendancePct ?? 0}%`} />
            <StatTile icon={<BookOpen className="h-5 w-5 text-cyan-300" />} label="Lectures" value={`${counts.data?.lectures ?? 0}`} />
            <StatTile icon={<Award className="h-5 w-5 text-violet-300" />} label="Achievements" value={`${counts.data?.achievements ?? 0}`} />
            <StatTile icon={<Flame className="h-5 w-5 text-orange-400" />} label="Streak" value={`${stats?.streak_days ?? 0}d`} />
            <StatTile icon={<Coins className="h-5 w-5 text-amber-300" />} label="Coins" value={(stats?.coins ?? 0).toLocaleString()} />
            <StatTile icon={<Zap className="h-5 w-5 text-yellow-300" />} label="XP" value={(stats?.xp ?? 0).toLocaleString()} />
            <StatTile icon={<Crown className="h-5 w-5 text-amber-300" />} label="Level" value={`${stats?.level ?? 1}`} />
            <StatTile icon={<Scroll className="h-5 w-5 text-sky-300" />} label="Max Streak" value={`${stats?.max_streak ?? 0}d`} />
          </div>
        </section>
      </div>
    </div>
  );
}

function ResidenceAmbience() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, color-mix(in oklab, #f59e0b 22%, transparent), transparent 55%), radial-gradient(ellipse at 100% 100%, color-mix(in oklab, var(--monarch) 30%, transparent), transparent 60%)",
        }}
      />
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 flex items-center gap-2">
      {icon}
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground leading-none">{label}</div>
        <div className="text-sm font-orbitron font-bold leading-tight truncate">{value}</div>
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
      className="rune-border holo-card flex items-center gap-2 p-3 hover:monarch-glow transition-all text-sm font-bold"
    >
      {icon} {label}
    </Link>
  );
}
