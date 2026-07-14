import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Castle, Crown, Swords, Sparkles, Coins, Star, ShieldCheck, Ghost } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { getLectureProgress } from "@/lib/api/lecture-progression.functions";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/journey/$worldId/")({ component: WorldPage });

const DUNGEON_THEMES = [
  { emoji: "🗡️", grad: "from-rose-500 to-red-800", glow: "rgba(244,63,94,0.6)" },
  { emoji: "🔮", grad: "from-fuchsia-500 to-purple-800", glow: "rgba(217,70,239,0.55)" },
  { emoji: "🛡️", grad: "from-amber-500 to-orange-700", glow: "rgba(251,146,60,0.6)" },
  { emoji: "🏹", grad: "from-emerald-500 to-teal-800", glow: "rgba(16,185,129,0.55)" },
  { emoji: "⚒️", grad: "from-slate-500 to-zinc-800", glow: "rgba(148,163,184,0.5)" },
  { emoji: "📿", grad: "from-cyan-500 to-blue-800", glow: "rgba(6,182,212,0.55)" },
];

const SUBJECT_SUBTITLE: Record<string, string> = {
  math: "Master logic, numbers and problem solving.",
  science: "Unlock the secrets of the natural world.",
  physics: "Bend forces and light to your will.",
  chemistry: "Transmute the elements at the alchemy bench.",
  biology: "Study the codex of living things.",
  english: "Master the arcane script of language.",
  hindi: "Sharpen your voice in the scriptorium.",
  language: "Master the arcane script of language.",
};

function subtitleFor(name: string): string {
  const n = (name ?? "").toLowerCase();
  for (const [k, v] of Object.entries(SUBJECT_SUBTITLE)) if (n.includes(k)) return v;
  return "Chart your path through this world.";
}

function WorldPage() {
  const { worldId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const progressFn = useServerFn(getLectureProgress);
  const [gate, setGate] = useState<{ id: string; name: string } | null>(null);

  const data = useQuery({
    queryKey: ["journey-world", worldId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const subject = (await supabase.from("subjects").select("id, subject_name").eq("id", worldId).maybeSingle()).data;
      const chs =
        (
          await supabase
            .from("chapters")
            .select("id, chapter_name, chapter_number, completion_xp, completion_coins")
            .eq("subject_id", worldId)
            .order("chapter_number")
        ).data ?? [];
      const chapterCompletions = (await supabase.from("chapter_completions").select("chapter_id").eq("user_id", user!.id)).data ?? [];
      return { subject, chs, chapterCompletions };
    },
  });

  const progress = useQuery({
    queryKey: ["lecture-progress", user?.id],
    enabled: !!user?.id,
    queryFn: () => progressFn(),
  });

  const dungeons = useMemo(() => {
    if (!data.data) return [];
    const { chs, chapterCompletions } = data.data;
    const doneChs = new Set(chapterCompletions.map((c) => c.chapter_id));
    const aggMap = new Map((progress.data?.chapters ?? []).map((c) => [c.chapter_id, c]));
    return chs.map((c, i) => {
      const agg = aggMap.get(c.id);
      const theme = DUNGEON_THEMES[i % DUNGEON_THEMES.length];
      const bossCleared = doneChs.has(c.id);
      const total = agg?.total ?? 0;
      const passed = agg?.passed ?? 0;
      const pct = agg?.percent ?? 0;
      const difficulty = Math.min(3, 1 + Math.floor(i / 2));
      return {
        ...c,
        theme,
        total,
        passed,
        pct,
        bossCleared,
        difficulty,
        nextQuest: agg?.next_to_unlock?.lecture_number ?? null,
      };
    });
  }, [data.data, progress.data]);

  const stats = useMemo(() => {
    const totalDungeons = dungeons.length;
    const clearedDungeons = dungeons.filter((d) => d.bossCleared).length;
    const totalQuests = dungeons.reduce((s, d) => s + d.total, 0);
    const passedQuests = dungeons.reduce((s, d) => s + d.passed, 0);
    const pct = totalQuests > 0 ? Math.round((passedQuests / totalQuests) * 100) : 0;
    const recommended = dungeons.find((d) => d.nextQuest !== null) ?? dungeons.find((d) => !d.bossCleared) ?? null;
    return { totalDungeons, clearedDungeons, totalQuests, passedQuests, pct, recommended };
  }, [dungeons]);

  const subjectName = data.data?.subject?.subject_name ?? "World";
  const subtitle = subtitleFor(subjectName);

  function enterDungeon(id: string, name: string) {
    if (gate) return;
    setGate({ id, name });
    setTimeout(() => {
      navigate({ to: "/app/journey/$worldId/$dungeonId", params: { worldId, dungeonId: id } });
    }, 850);
  }

  return (
    <div className="space-y-5">
      <Link to="/app" className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> Back to Campus
      </Link>

      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-amber-400/25 p-5 md:p-6"
        style={{
          background:
            "linear-gradient(135deg, rgba(30,27,75,0.9) 0%, rgba(76,29,149,0.85) 55%, rgba(124,45,18,0.85) 100%)",
          boxShadow: "0 20px 60px -20px rgba(251,191,36,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
        }}
      >
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(251,191,36,0.35), transparent 40%), radial-gradient(circle at 80% 60%, rgba(167,139,250,0.35), transparent 45%)",
          }}
        />
        <div className="relative flex items-start gap-4">
          <div className="h-14 w-14 md:h-16 md:w-16 rounded-2xl grid place-items-center shrink-0"
            style={{
              background: "linear-gradient(135deg,#f59e0b,#b45309)",
              boxShadow: "0 10px 25px rgba(0,0,0,0.55), 0 0 30px rgba(251,191,36,0.55)",
              border: "2px solid rgba(255,255,255,0.25)",
            }}>
            <Castle className="h-7 w-7 md:h-8 md:w-8 text-amber-50" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300 font-orbitron font-bold">
              World · Building Interior
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-orbitron text-amber-50 truncate">
              {subjectName.toUpperCase()}
            </h1>
            <p className="text-sm text-amber-100/80 mt-1">{subtitle}</p>
          </div>
        </div>

        {/* Progress stats grid */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          <StatChip label="Progress" value={`${stats.pct}%`} icon={<Sparkles className="h-3.5 w-3.5" />} />
          <StatChip label="Dungeons" value={`${stats.clearedDungeons}/${stats.totalDungeons}`} icon={<Castle className="h-3.5 w-3.5" />} />
          <StatChip label="Quests" value={`${stats.passedQuests}/${stats.totalQuests}`} icon={<Swords className="h-3.5 w-3.5" />} />
          <StatChip label="Bosses" value={`${stats.clearedDungeons}`} icon={<Crown className="h-3.5 w-3.5" />} />
        </div>

        {/* Progress bar */}
        <div className="relative mt-3">
          <div className="h-2 rounded-full bg-black/40 overflow-hidden border border-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full"
              style={{ background: "linear-gradient(90deg,#fbbf24,#f97316,#ef4444)" }}
            />
          </div>
        </div>

        {/* Recommended */}
        {stats.recommended && (
          <div className="relative mt-4 flex items-center gap-2 text-xs md:text-sm">
            <span className="text-amber-300 font-orbitron font-bold uppercase tracking-widest text-[10px]">
              Current Objective
            </span>
            <span className="text-amber-50 font-semibold truncate">
              ⚔ {stats.recommended.chapter_name}
              {stats.recommended.nextQuest ? ` → Quest ${String(stats.recommended.nextQuest).padStart(2, "0")}` : ""}
            </span>
          </div>
        )}
      </motion.div>

      {/* Dungeon list */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300 font-orbitron font-bold mb-2">
          Dungeons
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {dungeons.map((d, i) => {
            const bossState: "cleared" | "ready" | "locked" =
              d.bossCleared ? "cleared" : d.total > 0 && d.passed === d.total ? "ready" : "locked";
            return (
              <motion.button
                key={d.id}
                type="button"
                onClick={() => enterDungeon(d.id, d.chapter_name)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="text-left block rounded-2xl glass-card p-4 relative overflow-hidden border border-white/10"
                style={{
                  boxShadow: `0 10px 30px -10px ${d.theme.glow}`,
                }}
              >
                {/* rune corner */}
                <div
                  className="absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-25 pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${d.theme.glow}, transparent 70%)` }}
                />
                <div className="flex items-center gap-3">
                  <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${d.theme.grad} grid place-items-center text-2xl shadow-lg shrink-0 border border-white/20`}>
                    {d.bossCleared ? <Crown className="h-7 w-7 text-amber-200 drop-shadow" /> : <span>{d.theme.emoji}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">
                        Dungeon {String(d.chapter_number).padStart(2, "0")}
                      </div>
                      <DifficultyStars n={d.difficulty} />
                    </div>
                    <div className="font-extrabold truncate">{d.chapter_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Swords className="h-3 w-3" /> {d.passed}/{d.total} Quests cleared · {d.pct}%
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-2">
                      <div className={`h-full bg-gradient-to-r ${d.theme.grad}`} style={{ width: `${d.pct}%` }} />
                    </div>
                    {/* Reward preview strip */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px]">
                      <RewardChip icon={<Sparkles className="h-3 w-3" />} label={`+${d.completion_xp ?? 100} XP`} />
                      <RewardChip icon={<Coins className="h-3 w-3" />} label={`+${d.completion_coins ?? 50}`} />
                      <RewardChip icon={<ShieldCheck className="h-3 w-3" />} label="Badge" />
                      <RewardChip icon={<Ghost className="h-3 w-3" />} label="Shadow" />
                    </div>
                    <div className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${
                      bossState === "cleared" ? "text-amber-300"
                      : bossState === "ready" ? "text-rose-300"
                      : "text-muted-foreground"
                    }`}>
                      {bossState === "cleared" ? <><Crown className="h-3 w-3" /> Boss Defeated</>
                      : bossState === "ready" ? <><Crown className="h-3 w-3" /> Boss: Ready</>
                      : <><Crown className="h-3 w-3" /> Boss: Locked</>}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
          {dungeons.length === 0 && !data.isLoading && (
            <div className="col-span-full rounded-2xl glass-card p-6 text-center text-sm text-muted-foreground">
              No dungeons in this world yet.
            </div>
          )}
        </div>
      </div>

      {/* Dungeon Gate transition overlay */}
      {gate && <DungeonGate name={gate.name} />}
    </div>
  );
}

function StatChip({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl px-3 py-2 border border-white/10" style={{ background: "rgba(0,0,0,0.35)" }}>
      <div className="text-[9px] uppercase tracking-widest text-amber-200/80 font-bold flex items-center gap-1">
        {icon} {label}
      </div>
      <div className="text-base md:text-lg font-extrabold font-orbitron text-amber-50">{value}</div>
    </div>
  );
}

function RewardChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-amber-100/90">
      {icon}
      {label}
    </span>
  );
}

function DifficultyStars({ n }: { n: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i <= n ? "text-amber-300 fill-amber-300" : "text-muted-foreground/50"}`}
        />
      ))}
    </span>
  );
}

function DungeonGate({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
      style={{ background: "radial-gradient(circle at center, rgba(0,0,0,0.6), rgba(0,0,0,0.95))" }}
    >
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: "-100%" }}
        transition={{ duration: 0.75, ease: "easeInOut", delay: 0.05 }}
        className="absolute inset-y-0 left-0 w-1/2"
        style={{
          background:
            "linear-gradient(90deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)",
          borderRight: "3px solid rgba(251,191,36,0.6)",
          boxShadow: "10px 0 30px rgba(0,0,0,0.8)",
        }}
      />
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: "100%" }}
        transition={{ duration: 0.75, ease: "easeInOut", delay: 0.05 }}
        className="absolute inset-y-0 right-0 w-1/2"
        style={{
          background:
            "linear-gradient(-90deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)",
          borderLeft: "3px solid rgba(251,191,36,0.6)",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.8)",
        }}
      />
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative text-center"
      >
        <div className="text-[10px] uppercase tracking-[0.5em] text-amber-300 font-orbitron font-bold">
          Entering Dungeon
        </div>
        <div className="text-3xl md:text-5xl font-extrabold font-orbitron text-amber-50 mt-1"
          style={{ textShadow: "0 0 30px rgba(251,191,36,0.7)" }}>
          {name}
        </div>
      </motion.div>
    </motion.div>
  );
}
