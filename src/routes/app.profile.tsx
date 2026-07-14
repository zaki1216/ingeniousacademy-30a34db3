import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  Award, BookOpen, CalendarCheck, Coins, Flame, Sparkles, Swords, Trophy, Zap,
  PawPrint, Backpack, FileText, Settings, Target, GraduationCap, Home, Shirt, Ghost,
  Scroll, Crown,
} from "lucide-react";

import { useAuth } from "@/lib/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getGamificationDashboard } from "@/lib/api/gamification.functions";
import { levelProgress } from "@/lib/gamification/leveling";
import { rankFromLevel, nextRank } from "@/lib/rpg/ranks";
import { RankBadge } from "@/components/rpg/RankBadge";
import { PetCompanion } from "@/components/rpg/PetCompanion";
import { DailyChestCard } from "@/components/gamification/DailyChestCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "Academy Residence — Ingenious Academy" },
      { name: "description", content: "Your personal Academy Residence — trophies, collections, wardrobe and daily rewards." },
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

  const nextGoal = computeNextGoal({
    level: stats?.level ?? 1,
    coins: stats?.coins ?? 0,
    bosses: counts.data?.bossesDefeated ?? 0,
  });

  return (
    <div className="relative">
      {/* Ambient warm residence backdrop */}
      <ResidenceAmbience />

      <div className="relative space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 flex-wrap"
        >
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
                Chamber of the Hunter
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
        </motion.div>

        {/* Player Card */}
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
                  background:
                    "conic-gradient(from 0deg, var(--monarch) 0%, transparent 25%, var(--rune) 50%, transparent 75%, var(--monarch) 100%)",
                  filter: "blur(14px)",
                  opacity: 0.55,
                }}
              />
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
              <div className="absolute -top-1 -right-1">
                <PetCompanion size="md" />
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
                {profile.data?.name || "Hunter"}
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

              {/* Micro stats */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <MiniStat icon={<Coins className="h-3.5 w-3.5 text-amber-300" />} label="Coins" value={(stats?.coins ?? 0).toLocaleString()} />
                <MiniStat icon={<Flame className="h-3.5 w-3.5 text-orange-400" />} label="Streak" value={`${stats?.streak_days ?? 0}d`} />
                <MiniStat icon={<CalendarCheck className="h-3.5 w-3.5 text-emerald-300" />} label="Attend." value={`${counts.data?.attendancePct ?? 0}%`} />
                <MiniStat icon={<Award className="h-3.5 w-3.5 text-violet-300" />} label="Badges" value={`${counts.data?.achievements ?? 0}`} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Daily Reward + Next Goal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DailyChestCard />
          <NextGoalCard goal={nextGoal} />
        </div>

        {/* Rooms of the Residence */}
        <section>
          <SectionHeader
            eyebrow="Explore your chambers"
            title="Rooms of the Residence"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <RoomTile
              to="/app/report-card"
              icon={<GraduationCap className="h-5 w-5" />}
              title="Player Desk"
              caption="Report card & records"
              tint="from-amber-500/20 to-amber-800/10"
            />
            <RoomTile
              to="/app/achievements"
              icon={<Trophy className="h-5 w-5" />}
              title="Trophy Shelf"
              caption="Achievements & feats"
              tint="from-yellow-500/25 to-orange-700/10"
              badge={`${counts.data?.achievements ?? 0}`}
            />
            <RoomTile
              to="/app/inventory"
              icon={<Backpack className="h-5 w-5" />}
              title="Inventory Chest"
              caption="Potions, tokens, keys"
              tint="from-emerald-500/20 to-emerald-800/10"
            />
            <RoomTile
              to="/app/settings"
              icon={<Shirt className="h-5 w-5" />}
              title="Wardrobe"
              caption="Frames, titles, themes"
              tint="from-fuchsia-500/20 to-purple-800/10"
            />
            <RoomTile
              to="/app/pets"
              icon={<PawPrint className="h-5 w-5" />}
              title="Pet Area"
              caption="Companions & bonds"
              tint="from-cyan-500/20 to-sky-800/10"
            />
            <RoomTile
              to="/app/collection"
              icon={<Ghost className="h-5 w-5" />}
              title="Shadow Gallery"
              caption="Summoned collection"
              tint="from-indigo-500/25 to-slate-900/20"
            />
            <RoomTile
              to="/app/achievements"
              icon={<Award className="h-5 w-5" />}
              title="Achievement Wall"
              caption="Badges & rarities"
              tint="from-rose-500/20 to-rose-800/10"
            />
            <RoomTile
              to="/app/notes"
              icon={<Scroll className="h-5 w-5" />}
              title="Study Table"
              caption="Scrolls & notes"
              tint="from-teal-500/20 to-emerald-800/10"
            />
          </div>
        </section>

        {/* Statistics */}
        <section>
          <SectionHeader eyebrow="Chronicles" title="Hunter Statistics" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatTile icon={<CalendarCheck className="h-5 w-5 text-emerald-300" />} label="Attendance" value={`${counts.data?.attendancePct ?? 0}%`} />
            <StatTile icon={<BookOpen className="h-5 w-5 text-cyan-300" />} label="Lectures" value={`${counts.data?.lectures ?? 0}`} />
            <StatTile icon={<Swords className="h-5 w-5 text-rose-400" />} label="Quests" value={`${counts.data?.quizzes ?? 0}`} />
            <StatTile icon={<Sparkles className="h-5 w-5 text-violet-300" />} label="Bosses Defeated" value={`${counts.data?.bossesDefeated ?? 0}`} />
            <StatTile icon={<Swords className="h-5 w-5 text-fuchsia-300" />} label="Arena Wins" value={`${counts.data?.arenaWins ?? 0}`} />
            <StatTile icon={<Flame className="h-5 w-5 text-orange-400" />} label="Streak" value={`${stats?.streak_days ?? 0}d`} />
            <StatTile icon={<Coins className="h-5 w-5 text-amber-300" />} label="Coins Earned" value={(stats?.coins ?? 0).toLocaleString()} />
            <StatTile icon={<Zap className="h-5 w-5 text-yellow-300" />} label="XP Earned" value={(stats?.xp ?? 0).toLocaleString()} />
          </div>
        </section>

        {/* Collection Progress */}
        <section>
          <SectionHeader eyebrow="Curator's ledger" title="Collection Progress" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ProgressBar label="Achievements" have={counts.data?.achievements ?? 0} total={80} color="var(--monarch)" to="/app/achievements" />
            <ProgressBar label="Shadows" have={0} total={50} color="#7c3aed" to="/app/collection" />
            <ProgressBar label="Pets" have={0} total={20} color="#22d3ee" to="/app/pets" />
            <ProgressBar label="Titles" have={0} total={40} color="#f59e0b" to="/app/settings" />
            <ProgressBar label="Inventory Items" have={0} total={60} color="#10b981" to="/app/inventory" />
            <ProgressBar label="Lectures Mastered" have={counts.data?.lectures ?? 0} total={Math.max(100, (counts.data?.lectures ?? 0) + 20)} color="#38bdf8" to="/app/journey" />
          </div>
        </section>

        {/* Hunter Menu */}
        <section>
          <SectionHeader eyebrow="Quick paths" title="Hunter Menu" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            <QuickLink to="/app/talents" icon={<Target className="h-4 w-4" />} label="Talents" />
            <QuickLink to="/app/leaderboard" icon={<Trophy className="h-4 w-4" />} label="Rankings" />
            <QuickLink to="/app/attendance" icon={<CalendarCheck className="h-4 w-4" />} label="Attendance" />
            <QuickLink to="/app/announcements" icon={<FileText className="h-4 w-4" />} label="News" />
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------------- Components ---------------- */

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
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-amber-200/60"
          style={{
            left: `${(i * 73) % 100}%`,
            top: `${(i * 37) % 100}%`,
            filter: "blur(0.5px)",
          }}
          animate={{
            y: [0, -18, 0],
            opacity: [0.2, 0.9, 0.2],
          }}
          transition={{ duration: 5 + (i % 4), repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-3 px-1">
      <div className="text-[10px] font-orbitron uppercase tracking-[0.28em] text-[var(--rune)]">
        {eyebrow}
      </div>
      <h3 className="text-lg sm:text-xl font-extrabold">{title}</h3>
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

function RoomTile({
  to, icon, title, caption, tint, badge,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  caption: string;
  tint: string;
  badge?: string;
}) {
  return (
    <Link to={to} className="group relative">
      <motion.div
        whileHover={{ y: -3 }}
        className="rune-border holo-card relative overflow-hidden p-4 h-full transition-all group-hover:monarch-glow"
      >
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-70", tint)} />
        <div
          className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, rgba(255,220,150,0.4), transparent 70%)" }}
        />
        <div className="relative">
          <div className="h-10 w-10 rounded-xl grid place-items-center bg-white/10 border border-white/15 text-white/90">
            {icon}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="text-sm font-extrabold">{title}</div>
            {badge && (
              <span className="text-[10px] font-orbitron font-bold px-1.5 py-0.5 rounded-md bg-white/10 border border-white/15">
                {badge}
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{caption}</div>
        </div>
      </motion.div>
    </Link>
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

function ProgressBar({
  label, have, total, color, to,
}: {
  label: string; have: number; total: number; color: string; to: string;
}) {
  const pct = Math.min(100, Math.round((have / Math.max(1, total)) * 100));
  return (
    <Link to={to} className="rune-border holo-card p-3 hover:monarch-glow transition-all block">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-bold">{label}</div>
        <div className="text-[11px] font-orbitron tracking-wider text-muted-foreground">
          {have} / {total}
        </div>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8 }}
          className="h-full"
          style={{ background: `linear-gradient(90deg, ${color}, color-mix(in oklab, ${color} 60%, white 20%))` }}
        />
      </div>
    </Link>
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

function NextGoalCard({ goal }: { goal: { title: string; caption: string; to: string; icon: React.ReactNode } }) {
  return (
    <Link
      to={goal.to}
      className="rune-border holo-card relative overflow-hidden p-4 flex items-center gap-4 hover:monarch-glow transition-all"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 100% 0%, color-mix(in oklab, var(--monarch) 32%, transparent), transparent 55%)",
        }}
      />
      <div
        className="relative h-14 w-14 rounded-2xl grid place-items-center text-white"
        style={{
          background: "var(--gradient-monarch)",
          boxShadow: "0 0 22px color-mix(in oklab, var(--monarch) 40%, transparent)",
        }}
      >
        {goal.icon}
      </div>
      <div className="relative flex-1 min-w-0">
        <div className="text-[10px] font-orbitron uppercase tracking-[0.24em] text-[var(--rune)]">
          Next Objective
        </div>
        <div className="text-base font-extrabold truncate">{goal.title}</div>
        <div className="text-[12px] text-muted-foreground truncate">{goal.caption}</div>
      </div>
    </Link>
  );
}

function computeNextGoal({ level, coins, bosses }: { level: number; coins: number; bosses: number }) {
  if (bosses < 1) {
    return {
      title: "Defeat your first Boss",
      caption: "Clear a chapter dungeon to earn a trophy.",
      to: "/app/journey",
      icon: <Sparkles className="h-6 w-6" />,
    };
  }
  const nextMilestone = Math.ceil((level + 1) / 5) * 5;
  if (level < nextMilestone) {
    return {
      title: `Reach Level ${nextMilestone}`,
      caption: `Currently LV ${level} — complete quests to gain XP.`,
      to: "/app/journey",
      icon: <Zap className="h-6 w-6" />,
    };
  }
  if (coins < 5000) {
    return {
      title: "Collect 5,000 Coins",
      caption: `${coins.toLocaleString()} banked — grind quests and arenas.`,
      to: "/app/shop",
      icon: <Coins className="h-6 w-6" />,
    };
  }
  return {
    title: "Ascend to the next Rank",
    caption: "Keep clearing dungeons to earn your promotion.",
    to: "/app/journey",
    icon: <Crown className="h-6 w-6" />,
  };
}
