import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronRight, ChevronLeft, Castle, Crown, Swords } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";

export const Route = createFileRoute("/app/journey/$worldId/")({ component: WorldPage });

const DUNGEON_THEMES = [
  { emoji: "🗡️", grad: "from-rose-500 to-red-800" },
  { emoji: "🔮", grad: "from-fuchsia-500 to-purple-800" },
  { emoji: "🛡️", grad: "from-amber-500 to-orange-700" },
  { emoji: "🏹", grad: "from-emerald-500 to-teal-800" },
  { emoji: "⚒️", grad: "from-slate-500 to-zinc-800" },
  { emoji: "📿", grad: "from-cyan-500 to-blue-800" },
];

function WorldPage() {
  const { worldId } = Route.useParams();
  const { user } = useAuth();

  const data = useQuery({
    queryKey: ["journey-world", worldId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const subject = (await supabase.from("subjects").select("id, subject_name").eq("id", worldId).maybeSingle()).data;
      const chs = (await supabase.from("chapters").select("id, chapter_name, chapter_number").eq("subject_id", worldId).order("chapter_number")).data ?? [];
      const chIds = chs.map((c) => c.id);
      const lecs = chIds.length
        ? (await supabase.from("lectures").select("id, chapter_id").in("chapter_id", chIds)).data ?? []
        : [];
      const completions = (await supabase.from("video_completions").select("lecture_id").eq("user_id", user!.id)).data ?? [];
      const chapterCompletions = (await supabase.from("chapter_completions").select("chapter_id").eq("user_id", user!.id)).data ?? [];
      return { subject, chs, lecs, completions, chapterCompletions };
    },
  });

  const dungeons = useMemo(() => {
    if (!data.data) return [];
    const { chs, lecs, completions, chapterCompletions } = data.data;
    const doneLecs = new Set(completions.map((c) => c.lecture_id));
    const doneChs = new Set(chapterCompletions.map((c) => c.chapter_id));
    return chs.map((c, i) => {
      const cLecs = lecs.filter((l) => l.chapter_id === c.id);
      const watched = cLecs.filter((l) => doneLecs.has(l.id)).length;
      const total = cLecs.length;
      const pct = total > 0 ? Math.round((watched / total) * 100) : 0;
      const cleared = doneChs.has(c.id);
      const theme = DUNGEON_THEMES[i % DUNGEON_THEMES.length];
      return { ...c, theme, total, watched, pct, cleared };
    });
  }, [data.data]);

  const subjectName = data.data?.subject?.subject_name ?? "World";

  return (
    <div className="space-y-5">
      <Link to="/app/journey" className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> All Worlds
      </Link>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-amber-300 font-orbitron font-bold">World</div>
        <h1 className="text-2xl md:text-3xl font-extrabold font-orbitron flex items-center gap-2">
          <Castle className="h-6 w-6 text-primary" /> {subjectName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose a Dungeon to begin. Clear all Quests inside to face the Chapter Boss.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {dungeons.map((d, i) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link
              to="/app/journey/$worldId/$dungeonId"
              params={{ worldId, dungeonId: d.id }}
              className="block rounded-2xl glass-card p-4 hover:scale-[1.02] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${d.theme.grad} grid place-items-center text-2xl shadow-lg shrink-0`}>
                  {d.cleared ? <Crown className="h-7 w-7 text-amber-200 drop-shadow" /> : <span>{d.theme.emoji}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">
                    Dungeon {d.chapter_number}{d.cleared ? " · Cleared" : ""}
                  </div>
                  <div className="font-extrabold truncate">{d.chapter_name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Swords className="h-3 w-3" /> {d.total} Quests · {d.watched} done · {d.pct}%
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-2">
                    <div className={`h-full bg-gradient-to-r ${d.theme.grad}`} style={{ width: `${d.pct}%` }} />
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </Link>
          </motion.div>
        ))}
        {dungeons.length === 0 && !data.isLoading && (
          <div className="col-span-full rounded-2xl glass-card p-6 text-center text-sm text-muted-foreground">
            No dungeons in this world yet.
          </div>
        )}
      </div>
    </div>
  );
}
