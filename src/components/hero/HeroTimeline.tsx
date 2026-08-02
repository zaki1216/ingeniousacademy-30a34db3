import { motion } from "framer-motion";

import type { HeroTimelineEvent } from "@/lib/hero/types";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Hero Timeline — the student's Academy story, newest first. */
export function HeroTimeline({ events }: { events: HeroTimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rune-border holo-card p-4 text-sm text-muted-foreground">
        Your Academy story starts with your first Quest.
      </div>
    );
  }

  return (
    <div className="rune-border holo-card p-4 sm:p-5">
      <ol className="relative pl-6 sm:pl-7">
        <span className="absolute left-2 sm:left-2.5 top-1 bottom-1 w-px bg-gradient-to-b from-amber-300/60 via-white/15 to-transparent" />
        {events.map((e, i) => (
          <motion.li
            key={e.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.4) }}
            className="relative pb-4 last:pb-0"
          >
            <span className="absolute -left-6 sm:-left-7 top-0 h-5 w-5 rounded-full grid place-items-center text-[11px] bg-[var(--bg-void)] ring-1 ring-white/20">
              {e.icon}
            </span>
            <div className="text-sm font-extrabold leading-tight">{e.title}</div>
            {e.detail && (
              <div className="text-[11px] text-muted-foreground leading-snug">{e.detail}</div>
            )}
            <div className="text-[10px] font-orbitron uppercase tracking-widest text-[var(--rune)] mt-0.5">
              {formatDate(e.at)}
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
