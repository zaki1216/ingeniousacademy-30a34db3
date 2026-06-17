import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Map as MapIcon, Trophy, Sparkles, ChevronRight, Star, Shield, Swords, Skull, Ghost } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";
import { dungeonMeta, DIFFICULTY_TONE } from "@/lib/rpg/dungeons";
import { rankFromLevel } from "@/lib/rpg/ranks";

export const Route = createFileRoute("/app/worlds")({ component: WorldsPage });

// Visual realm pool — assigned to subjects in load order so it's stable.
const WORLD_THEMES = [
  { emoji: "🌲", name: "Verdant Realm",     grad: "from-emerald-500 to-green-800",  ring: "ring-emerald-300/50" },
  { emoji: "🏰", name: "Crimson Citadel",   grad: "from-indigo-500 to-purple-800",  ring: "ring-indigo-300/50" },
  { emoji: "⚔️", name: "Shattered Kingdom", grad: "from-rose-500 to-red-800",       ring: "ring-rose-300/50" },
  { emoji: "⛰️", name: "Ironpeak Highlands", grad: "from-slate-500 to-stone-800",   ring: "ring-slate-300/50" },
  { emoji: "🌌", name: "Astral Void",       grad: "from-fuchsia-500 to-purple-900", ring: "ring-fuchsia-300/50" },
  { emoji: "🏝️", name: "Aether Isles",     grad: "from-cyan-400 to-blue-800",      ring: "ring-cyan-300/50" },
  { emoji: "🔥", name: "Emberforge",        grad: "from-orange-500 to-red-800",     ring: "ring-orange-300/50" },
  { emoji: "❄️", name: "Frostbound Tundra", grad: "from-sky-400 to-indigo-700",     ring: "ring-sky-300/50" },
];

function WorldsPage() {
  const { user } = useAuth();
  const [openWorld, setOpenWorld] = useState<string | null>(null);

  const profile = useQuery({
    queryKey: ["profile-standard", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase.from("profiles").select("standard_id").eq("id", user!.id).maybeSingle()).data,
  });
  const standardId = profile.data?.standard_id;

  const stats = useQuery({
    queryKey: ["gam-level", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase.from("gamification_stats").select("level").eq("user_id", user!.id).maybeSingle()).data,
  });
  const playerLevel = stats.data?.level ?? 1;
  const playerRank = rankFromLevel(playerLevel);

  const data = useQuery({
    queryKey: ["worlds-data", standardId, user?.id],
    enabled: !!standardId && !!user?.id,
    queryFn: async () => {
      const subs = (await supabase.from("subjects").select("id, subject_name").eq("standard_id", standardId!)).data ?? [];
      const chs = subs.length
        ? (await supabase.from("chapters").select("id, chapter_name, chapter_number, subject_id").in("subject_id", subs.map((s) => s.id)).order("chapter_number")).data ?? []
        : [];
      const lecs = chs.length
        ? (await supabase.from("lectures").select("id, chapter_id").in("chapter_id", chs.map((c) => c.id))).data ?? []
        : [];
      const completions = (await supabase.from("video_completions").select("lecture_id").eq("user_id", user!.id)).data ?? [];
      const doneSet = new Set(completions.map((c) => c.lecture_id));
      return { subs, chs, lecs, doneSet };
    },
  });

  const worlds = useMemo(() => {
    if (!data.data) return [];
    const { subs, chs, lecs, doneSet } = data.data;
    return subs.map((s, i) => {
      const theme = WORLD_THEMES[i % WORLD_THEMES.length];
      const subChapters = chs.filter((c) => c.subject_id === s.id);
      const subLectures = lecs.filter((l) => subChapters.some((c) => c.id === l.chapter_id));
      const watched = subLectures.filter((l) => doneSet.has(l.id)).length;
      const total = subLectures.length;
      const pct = total > 0 ? Math.round((watched / total) * 100) : 0;
      const recommendedLevel = Math.max(1, i * 5 + 1);
      return {
        id: s.id,
        name: s.subject_name,
        theme,
        recommendedLevel,
        chapters: subChapters.map((c) => {
          const cLec = lecs.filter((l) => l.chapter_id === c.id);
          const cDone = cLec.filter((l) => doneSet.has(l.id)).length;
          return {
            id: c.id,
            chapter_name: c.chapter_name,
            chapter_number: c.chapter_number,
            total: cLec.length,
            done: cDone,
            meta: dungeonMeta(c.chapter_name, c.chapter_number, cLec.length, cDone, playerLevel),
          };
        }),
        watched,
        total,
        pct,
      };
    });
  }, [data.data, playerLevel]);

  if (!standardId) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold flex items-center gap-2 font-orbitron"><MapIcon className="h-6 w-6" /> World Map</h1>
        <p className="text-muted-foreground text-sm">Your standard is not set yet. Please contact your admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-amber-300 font-orbitron font-bold">Choose your destiny</div>
        <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2 font-orbitron">
          <MapIcon className="h-6 w-6 text-primary" /> World Map
        </h1>
        <p className="text-sm text-muted-foreground">
          You are <span className="font-bold text-foreground">{playerRank.label}</span> · Level {playerLevel}. Conquer realms to claim sovereignty.
        </p>
      </div>

      {/* Interactive mini progression map — tap a node to jump to that realm */}
      {worlds.length > 0 && (
        <div className="relative rounded-2xl border border-border/60 bg-card/40 p-3 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {worlds.map((w, i) => {
              const unlocked = i === 0 || worlds[i - 1].pct >= 50 || worlds[i - 1].total === 0;
              const isActive = openWorld === w.id;
              return (
                <div key={w.id} className="flex items-center gap-2">
                  <button
                    onClick={() => unlocked && setOpenWorld(isActive ? null : w.id)}
                    disabled={!unlocked}
                    title={`${w.theme.name} · ${w.pct}% · Lv ${w.recommendedLevel}+`}
                    className={cn(
                      "relative h-14 w-14 rounded-full grid place-items-center text-2xl shrink-0 transition-transform",
                      "bg-gradient-to-br", w.theme.grad,
                      unlocked ? "hover:scale-110" : "opacity-40 grayscale cursor-not-allowed",
                      isActive && "ring-2 ring-primary scale-110 monarch-glow",
                    )}
                  >
                    {unlocked ? w.theme.emoji : <Lock className="h-5 w-5 text-white/80" />}
                    <span className="absolute -bottom-1 -right-1 text-[9px] font-orbitron font-bold bg-background/90 text-foreground rounded-full px-1.5 py-px border border-border">
                      {w.pct}%
                    </span>
                  </button>
                  {i < worlds.length - 1 && (
                    <div className={cn("h-px w-6 sm:w-10", worlds[i].pct >= 50 ? "bg-primary" : "bg-border")} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground text-center font-orbitron uppercase tracking-widest">
            Tap a realm to view its dungeons
          </div>
        </div>
      )}

      {/* Visual progression spine — connects each realm in order */}
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-primary/60 via-primary/20 to-transparent pointer-events-none hidden sm:block" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {worlds.map((w, i) => {
            const unlocked = i === 0 || worlds[i - 1].pct >= 50 || worlds[i - 1].total === 0;
            const levelGate = playerLevel >= w.recommendedLevel;
            const conquered = w.total > 0 && w.pct === 100;
            const isOpen = openWorld === w.id;
            return (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative"
              >
                <button
                  onClick={() => unlocked && setOpenWorld(isOpen ? null : w.id)}
                  className={cn(
                    "block w-full text-left relative overflow-hidden rounded-3xl glass-card p-0",
                    !unlocked && "pointer-events-none opacity-60",
                  )}
                >
                  <div className={cn("relative h-32 bg-gradient-to-br", w.theme.grad)}>
                    <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_60%,white_0%,transparent_45%)]" />
                    <div className="absolute top-3 left-3 flex flex-col items-start gap-1">
                      <span className="bg-black/40 text-white text-[10px] font-orbitron uppercase px-2 py-0.5 rounded-full backdrop-blur">
                        Realm {i + 1}
                      </span>
                      <span className={cn(
                        "text-[10px] font-orbitron uppercase px-2 py-0.5 rounded-full backdrop-blur flex items-center gap-1",
                        levelGate ? "bg-emerald-500/30 text-emerald-50" : "bg-rose-500/30 text-rose-50",
                      )}>
                        <Shield className="h-3 w-3" /> Lv {w.recommendedLevel}+
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                      {conquered && (
                        <span className="bg-amber-400 text-amber-950 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Trophy className="h-3 w-3" /> Conquered
                        </span>
                      )}
                      <div className="flex">
                        {Array.from({ length: 3 }).map((_, k) => (
                          <Star key={k} className={cn(
                            "h-4 w-4",
                            w.pct >= (k + 1) * 33 ? "fill-amber-300 text-amber-300" : "text-white/30",
                          )} />
                        ))}
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center text-7xl drop-shadow-2xl animate-float">
                      {w.theme.emoji}
                    </div>
                    {!unlocked && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="text-center">
                          <Lock className="h-7 w-7 mx-auto text-white/80" />
                          <div className="text-[10px] uppercase font-bold text-white/80 mt-1 font-orbitron">Sealed</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-orbitron font-bold">
                          {w.theme.name}
                        </div>
                        <div className="font-extrabold leading-tight truncate">{w.name}</div>
                      </div>
                      <ChevronRight className={cn("h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform", isOpen && "rotate-90")} />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className="h-full bg-[image:var(--gradient-primary)]"
                          initial={{ width: 0 }}
                          animate={{ width: `${w.pct}%` }}
                          transition={{ duration: 0.7 }}
                        />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground tabular-nums font-orbitron">{w.pct}%</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{w.chapters.length} dungeons · {w.total} missions</span>
                      <span className="flex items-center gap-1 text-amber-300 font-bold font-orbitron">
                        <Sparkles className="h-3 w-3" /> +500 XP
                      </span>
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-2 space-y-2"
                    >
                      {w.chapters.map((c) => {
                        const tone = DIFFICULTY_TONE[c.meta.difficulty];
                        const cPct = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0;
                        return (
                          <Link
                            key={c.id}
                            to="/app/lectures"
                            className="block rounded-2xl border border-border/60 bg-card/70 p-3 hover:border-primary/50 transition"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className="h-12 w-12 rounded-xl grid place-items-center text-2xl shrink-0"
                                style={{ background: tone.bg, boxShadow: `inset 0 0 0 1px ${tone.color}55` }}
                              >
                                {c.meta.emoji}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="text-[10px] font-orbitron uppercase tracking-wider text-muted-foreground">
                                    Ch {c.chapter_number}
                                  </div>
                                  <span
                                    className="text-[10px] font-orbitron uppercase px-1.5 py-0.5 rounded"
                                    style={{ background: tone.bg, color: tone.color }}
                                  >
                                    {c.meta.difficulty}
                                  </span>
                                  {c.meta.bossAvailable && (
                                    <span className="text-[10px] font-orbitron uppercase px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 flex items-center gap-1">
                                      <Skull className="h-3 w-3" /> Boss
                                    </span>
                                  )}
                                </div>
                                <div className="font-bold truncate">{c.meta.name}</div>
                                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                                  <span className="flex items-center gap-1 font-orbitron">
                                    <Swords className="h-3 w-3" /> Lv {c.meta.recommendedLevel}+
                                  </span>
                                  <span className="flex items-center gap-1 text-amber-400 font-orbitron">
                                    <Sparkles className="h-3 w-3" /> +{c.meta.rewardXp} XP
                                  </span>
                                  <span className="font-orbitron text-yellow-300">🪙 +{c.meta.rewardCoins}</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${cPct}%` }} />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground tabular-nums font-orbitron">
                                    {c.done}/{c.total}
                                  </span>
                                </div>
                                <div
                                  className={cn(
                                    "mt-2 rounded-lg px-2 py-1.5 flex items-center gap-2 text-[10px] font-orbitron uppercase tracking-wider transition-colors",
                                    c.meta.shadow.unlocked
                                      ? "bg-fuchsia-500/20 text-fuchsia-200 ring-1 ring-fuchsia-400/60 animate-pulse"
                                      : "bg-muted/40 text-muted-foreground"
                                  )}
                                  aria-live="polite"
                                >
                                  <Ghost className="h-3 w-3 shrink-0" />
                                  <span className="flex-1 min-w-0 truncate normal-case tracking-normal">
                                    <b className="mr-1">{c.meta.shadow.name}:</b>
                                    {c.meta.shadow.requirement}
                                  </span>
                                  {c.meta.shadow.unlocked ? (
                                    <span className="text-[9px] font-bold bg-fuchsia-400 text-fuchsia-950 px-1.5 py-0.5 rounded">READY</span>
                                  ) : (
                                    <span className="text-[9px] tabular-nums">{Math.round(c.meta.shadow.progress * 100)}%</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                      {w.chapters.length === 0 && (
                        <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                          No dungeons forged here yet.
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {worlds.length === 0 && (
        <div className="rounded-2xl glass-card p-6 text-center text-muted-foreground text-sm">
          No worlds available yet. Check back soon!
        </div>
      )}
    </div>
  );
}
