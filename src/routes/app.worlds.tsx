import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Lock, Map as MapIcon, Trophy, Sparkles, ChevronRight, Star } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/worlds")({ component: WorldsPage });

// Visual theme pool — assigned to subjects in load order so it's stable
const WORLD_THEMES = [
  { emoji: "🌲", name: "Forest", grad: "from-emerald-500 to-green-700", ring: "ring-emerald-300/50" },
  { emoji: "🏰", name: "Castle", grad: "from-indigo-500 to-purple-700", ring: "ring-indigo-300/50" },
  { emoji: "⚔️", name: "Kingdom", grad: "from-rose-500 to-red-700", ring: "ring-rose-300/50" },
  { emoji: "⛰️", name: "Mountain", grad: "from-slate-500 to-stone-700", ring: "ring-slate-300/50" },
  { emoji: "🌌", name: "Galaxy", grad: "from-fuchsia-500 to-purple-800", ring: "ring-fuchsia-300/50" },
  { emoji: "🏝️", name: "Island", grad: "from-cyan-400 to-blue-700", ring: "ring-cyan-300/50" },
  { emoji: "🔥", name: "Volcano", grad: "from-orange-500 to-red-700", ring: "ring-orange-300/50" },
  { emoji: "❄️", name: "Tundra", grad: "from-sky-400 to-indigo-600", ring: "ring-sky-300/50" },
];

function WorldsPage() {
  const { user } = useAuth();

  const profile = useQuery({
    queryKey: ["profile-standard", user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await supabase.from("profiles").select("standard_id").eq("id", user!.id).maybeSingle()).data,
  });
  const standardId = profile.data?.standard_id;

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
      return {
        id: s.id,
        name: s.subject_name,
        theme,
        chapters: subChapters.map((c) => {
          const cLec = lecs.filter((l) => l.chapter_id === c.id);
          const cDone = cLec.filter((l) => doneSet.has(l.id)).length;
          return { ...c, total: cLec.length, done: cDone };
        }),
        watched,
        total,
        pct,
      };
    });
  }, [data.data]);

  if (!standardId) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold flex items-center gap-2"><MapIcon className="h-6 w-6" /> World Map</h1>
        <p className="text-muted-foreground text-sm">Your standard is not set yet. Please contact your admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">Choose your destiny</div>
        <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
          <MapIcon className="h-6 w-6 text-primary-glow" /> World Map
        </h1>
        <p className="text-sm text-muted-foreground">Conquer each world to earn legendary rewards.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {worlds.map((w, i) => {
          const unlocked = i === 0 || worlds[i - 1].pct >= 50 || worlds[i - 1].total === 0;
          const conquered = w.total > 0 && w.pct === 100;
          return (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to="/app/lectures"
                className={cn(
                  "block relative overflow-hidden rounded-3xl glass-card p-0",
                  !unlocked && "pointer-events-none opacity-60",
                )}
              >
                <div className={cn("relative h-32 bg-gradient-to-br", w.theme.grad)}>
                  <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_60%,white_0%,transparent_45%)]" />
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
                        <div className="text-[10px] uppercase font-bold text-white/80 mt-1">Locked</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                        {w.theme.name} World
                      </div>
                      <div className="font-extrabold leading-tight truncate">{w.name}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
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
                    <span className="text-xs font-bold text-muted-foreground tabular-nums">{w.pct}%</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{w.chapters.length} zones · {w.total} missions</span>
                    <span className="flex items-center gap-1 text-amber-300 font-bold">
                      <Sparkles className="h-3 w-3" /> +500 XP
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {worlds.length === 0 && (
        <div className="rounded-2xl glass-card p-6 text-center text-muted-foreground text-sm">
          No worlds available yet. Check back soon!
        </div>
      )}
    </div>
  );
}
