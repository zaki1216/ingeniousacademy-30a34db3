import { motion } from "framer-motion";

import { LEGACY_KIND_STYLE, type LegacyEvent } from "@/lib/legacy/config";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Academy Legacy Timeline — the student's permanent story, newest first. */
export function LegacyTimeline({ events }: { events: LegacyEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rune-border holo-card p-4 text-sm text-muted-foreground">
        Your Academy Legacy begins with your very first Quest.
      </div>
    );
  }

  return (
    <div className="rune-border holo-card p-4 sm:p-5">
      <ol className="relative pl-6 sm:pl-7">
        <span className="absolute left-2 sm:left-2.5 top-1 bottom-1 w-px bg-gradient-to-b from-amber-300/60 via-white/15 to-transparent" />
        {events.map((e, i) => {
          const style = LEGACY_KIND_STYLE[e.kind] ?? LEGACY_KIND_STYLE.award;
          return (
            <motion.li
              key={e.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.4) }}
              className="relative pb-4 last:pb-0"
            >
              <span
                className="absolute -left-6 sm:-left-7 top-0 h-5 w-5 rounded-full grid place-items-center text-[11px] bg-[var(--bg-void)] ring-1"
                style={{ boxShadow: `0 0 10px -2px ${style.color}`, borderColor: style.color }}
              >
                {e.icon}
              </span>
              <div className="text-sm font-extrabold leading-tight">{e.title}</div>
              {e.detail && (
                <div className="text-[11px] text-muted-foreground leading-snug">{e.detail}</div>
              )}
              <div className="mt-0.5 flex items-center gap-2">
                <span
                  className="text-[9px] font-orbitron uppercase tracking-widest rounded-full px-1.5 py-0.5 border"
                  style={{ color: style.color, borderColor: `${style.color}55`, background: `${style.color}14` }}
                >
                  {style.label}
                </span>
                <span className="text-[10px] font-orbitron uppercase tracking-widest text-muted-foreground">
                  {formatDate(e.occurred_at)}
                </span>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
