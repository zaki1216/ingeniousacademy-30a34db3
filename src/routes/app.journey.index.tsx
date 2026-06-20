import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Map as MapIcon, ChevronRight, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";

export const Route = createFileRoute("/app/journey/")({ component: JourneyHome });

const WORLD_THEMES = [
  { emoji: "🌲", grad: "from-emerald-500 to-green-800",   suffix: "Verdant Realm" },
  { emoji: "🔥", grad: "from-orange-500 to-red-800",      suffix: "Ember Forge" },
  { emoji: "❄️", grad: "from-sky-400 to-indigo-700",     suffix: "Frostbound Tundra" },
  { emoji: "🌌", grad: "from-fuchsia-500 to-purple-900", suffix: "Astral Void" },
  { emoji: "⛰️", grad: "from-slate-500 to-stone-800",    suffix: "Ironpeak Highlands" },
  { emoji: "🏝️", grad: "from-cyan-400 to-blue-800",     suffix: "Aether Isles" },
  { emoji: "⚔️", grad: "from-rose-500 to-red-800",       suffix: "Shattered Kingdom" },
  { emoji: "🏰", grad: "from-indigo-500 to-purple-800",  suffix: "Crimson Citadel" },
];

function JourneyHome() {
  const { user } = useAuth();

  const profile = useQuery({
    queryKey: ["profile-standard", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase.from("profiles").select("standard_id").eq("id", user!.id).maybeSingle()).data,
  });
  const standardId = profile.data?.standard_id;

  const data = useQuery({
    queryKey: ["journey-worlds", standardId, user?.id],
    enabled: !!standardId && !!user?.id,
    queryFn: async () => {
      const subs = (await supabase.from("subjects").select("id, subject_name").eq("standard_id", standardId!)).data ?? [];
      const subIds = subs.map((s) => s.id);
      const chs = subIds.length
        ? (await supabase.from("chapters").select("id, subject_id").in("subject_id", subIds)).data ?? []
        : [];
      const chIds = chs.map((c) => c.id);
      const lecs = chIds.length
        ? (await supabase.from("lectures").select("id, chapter_id").in("chapter_id", chIds)).data ?? []
        : [];
      const completions = (await supabase.from("video_completions").select("lecture_id").eq("user_id", user!.id)).data ?? [];
      const chapterCompletions = (await supabase.from("chapter_completions").select("chapter_id").eq("user_id", user!.id)).data ?? [];
      return { subs, chs, lecs, completions, chapterCompletions };
    },
  });

  const worlds = useMemo(() => {
    if (!data.data) return [];
    const { subs, chs, lecs, completions, chapterCompletions } = data.data;
    const doneLecs = new Set(completions.map((c) => c.lecture_id));
    const doneChs = new Set(chapterCompletions.map((c) => c.chapter_id));
    return subs.map((s, i) => {
      const subChs = chs.filter((c) => c.subject_id === s.id);
      const subLecs = lecs.filter((l) => subChs.some((c) => c.id === l.chapter_id));
      const watched = subLecs.filter((l) => doneLecs.has(l.id)).length;
      const total = subLecs.length;
      const pct = total > 0 ? Math.round((watched / total) * 100) : 0;
      const cleared = subChs.filter((c) => doneChs.has(c.id)).length;
      const theme = WORLD_THEMES[i % WORLD_THEMES.length];
      return { id: s.id, name: s.subject_name, theme, chapters: subChs.length, cleared, total, watched, pct };
    });
  }, [data.data]);

  if (!standardId) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold flex items-center gap-2 font-orbitron">
          <MapIcon className="h-6 w-6" /> Journey
        </h1>
        <p className="text-muted-foreground text-sm">Your standard is not set. Contact your admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-amber-300 font-orbitron font-bold">
          Campaign · Act I
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold font-orbitron flex items-center gap-2">
          <MapIcon className="h-6 w-6 text-primary" /> Choose Your World
        </h1>
        <p className="text-sm text-muted-foreground">
          Every Subject is a World. Enter to raid its Dungeons, conquer Quests, and defeat the Chapter Boss.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {worlds.map((w, i) => (
          <motion.div
            key={w.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to="/app/journey/$worldId"
              params={{ worldId: w.id }}
              className="block rounded-2xl glass-card p-4 hover:scale-[1.02] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${w.theme.grad} grid place-items-center text-3xl shadow-xl shrink-0`}>
                  {w.theme.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">{w.theme.suffix}</div>
                  <div className="font-extrabold truncate">{w.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {w.chapters} Dungeons · {w.cleared} cleared
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-2">
                    <div className={`h-full bg-gradient-to-r ${w.theme.grad}`} style={{ width: `${w.pct}%` }} />
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </Link>
          </motion.div>
        ))}
        {worlds.length === 0 && !data.isLoading && (
          <div className="col-span-full rounded-2xl glass-card p-6 text-center text-sm text-muted-foreground">
            <Sparkles className="h-5 w-5 mx-auto mb-2 text-amber-300" />
            No worlds available yet.
          </div>
        )}
      </div>
    </div>
  );
}
