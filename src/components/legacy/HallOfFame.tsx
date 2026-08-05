import { motion } from "framer-motion";

import { HALL_CATEGORIES, type LegacyHallEntry } from "@/lib/legacy/config";

/**
 * Hall of Fame — grows automatically as certificates, titles, rare badges,
 * trophies and Academy awards accumulate. Recognition only.
 */
export function HallOfFame({
  entries,
  categories,
  compact,
}: {
  entries: LegacyHallEntry[];
  categories: string[];
  compact?: boolean;
}) {
  const shown = HALL_CATEGORIES.filter((c) => categories.includes(c.code));

  return (
    <div className="space-y-3">
      {shown.map((cat) => {
        const items = entries.filter((e) => e.category === cat.code);
        return (
          <div key={cat.code} className="rune-border holo-card p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-orbitron font-bold tracking-[0.2em] uppercase text-amber-300 flex items-center gap-1.5">
                <span>{cat.icon}</span> {cat.label}
              </div>
              <span className="text-[11px] text-muted-foreground">{items.length}</span>
            </div>
            {items.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Nothing here yet — this shelf fills itself as you progress.
              </p>
            ) : (
              <div
                className={
                  compact
                    ? "mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2"
                    : "mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2"
                }
              >
                {items.slice(0, compact ? 10 : 24).map((it, i) => (
                  <motion.div
                    key={it.id}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className="rounded-xl bg-white/5 border border-white/10 p-2 text-center"
                    title={it.detail ?? undefined}
                  >
                    <div className="text-2xl leading-none">{it.icon}</div>
                    <div className="mt-1 text-[10px] font-bold leading-tight truncate">{it.name}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
