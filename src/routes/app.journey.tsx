import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Map, Swords, Target, Castle, Flag } from "lucide-react";

export const Route = createFileRoute("/app/journey")({ component: JourneyPage });

const NODES: { to: string; title: string; sub: string; icon: typeof Map; gradient: string; emoji: string }[] = [
  { to: "/app/worlds",      title: "Worlds",       sub: "Math · Science · Language · Reasoning", icon: Map,    gradient: "from-emerald-500 to-teal-700",     emoji: "🗺️" },
  { to: "/app/worlds",      title: "Dungeons",     sub: "Chapter dungeons & boss rooms",          icon: Castle, gradient: "from-indigo-500 to-purple-800",    emoji: "🏰" },
  { to: "/app/quests",      title: "Quests",       sub: "Daily · Weekly · Chapter · Special",     icon: Target, gradient: "from-amber-500 to-orange-600",     emoji: "📜" },
  { to: "/app/tests",       title: "Boss Battles", sub: "End-of-chapter tests",                   icon: Swords, gradient: "from-rose-500 to-red-700",         emoji: "⚔️" },
  { to: "/app/lectures",    title: "Lectures",     sub: "Watch & learn",                          icon: Flag,   gradient: "from-cyan-500 to-blue-700",        emoji: "🎬" },
];

function JourneyPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.24em] font-orbitron text-primary-glow">
          Progression Map
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold">Your Journey</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Travel worlds, raid dungeons, hunt quests, and defeat bosses.
        </p>
      </div>

      {/* Progress rail */}
      <div className="relative rounded-2xl glass-card p-4 overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_10%_50%,var(--monarch)_0,transparent_50%),radial-gradient(circle_at_90%_50%,var(--rune)_0,transparent_50%)]" />
        <div className="relative flex items-center gap-2 overflow-x-auto pb-1">
          {NODES.map((n, i) => (
            <div key={n.to + i} className="flex items-center shrink-0">
              <div className="flex flex-col items-center w-20">
                <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${n.gradient} grid place-items-center text-xl shadow-lg`}>
                  {n.emoji}
                </div>
                <div className="text-[10px] font-bold text-center mt-1 truncate w-full">{n.title}</div>
              </div>
              {i < NODES.length - 1 && (
                <div className="w-8 h-0.5 bg-gradient-to-r from-white/40 to-white/10 mx-1" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {NODES.map((n, i) => {
          const Icon = n.icon;
          return (
            <motion.div
              key={n.to + i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={n.to}
                className="block rounded-2xl glass-card p-4 hover:scale-[1.02] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${n.gradient} grid place-items-center shadow-lg`}>
                    <Icon className="h-6 w-6 text-white drop-shadow" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{n.sub}</div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
