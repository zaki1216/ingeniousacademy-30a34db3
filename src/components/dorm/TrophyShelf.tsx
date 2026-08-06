import { motion } from "framer-motion";

import type { DormTrophy } from "@/lib/dorm/config";

/** Trophy Shelf — fills itself from Dungeon clears, ranks and future awards. */
export function TrophyShelf({ trophies }: { trophies: DormTrophy[] }) {
  return (
    <div className="rune-border holo-card p-4">
      <div className="text-[11px] font-orbitron font-bold tracking-[0.2em] uppercase text-amber-300">
        Trophy Shelf
      </div>
      {trophies.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          You haven't earned any trophies yet. Clear your first Dungeon and its trophy appears
          here automatically.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2">
          {trophies.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.4) }}
              className="rounded-xl bg-white/5 border border-white/10 p-2 text-center"
              title={t.detail ?? undefined}
            >
              <div className="text-2xl leading-none">{t.icon}</div>
              <div className="mt-1 text-[10px] font-bold leading-tight truncate">{t.name}</div>
            </motion.div>
          ))}
        </div>
      )}
      <div className="mt-3 h-1 rounded-full bg-gradient-to-r from-amber-500/60 via-amber-200/40 to-transparent" />
    </div>
  );
}
