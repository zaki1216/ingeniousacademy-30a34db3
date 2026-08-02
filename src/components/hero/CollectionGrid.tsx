import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { RARITY_STYLE, type EvaluatedEntry } from "@/lib/hero/catalog";

/**
 * Shared grid used by both the Achievement Gallery and the Badge Collection.
 * Locked entries stay visible but dimmed, with progress toward unlocking.
 */
export function CollectionGrid({
  entries,
  showRarity = false,
}: {
  entries: EvaluatedEntry[];
  showRarity?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
      {entries.map((e) => {
        const r = RARITY_STYLE[e.rarity];
        return (
          <div
            key={e.code}
            className={cn(
              "rune-border holo-card relative overflow-hidden p-3 flex gap-3 transition-all",
              e.unlocked ? "opacity-100" : "opacity-60",
            )}
            style={
              e.unlocked
                ? { boxShadow: `0 0 28px -18px ${r.color}`, borderColor: `${r.color}55` }
                : undefined
            }
          >
            <div
              className="h-11 w-11 shrink-0 rounded-xl grid place-items-center text-xl relative"
              style={{
                background: e.unlocked ? r.gradient : "rgba(255,255,255,0.06)",
              }}
            >
              {e.unlocked ? (
                <span>{e.icon}</span>
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold leading-tight truncate">{e.name}</div>
              <div className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                {e.description}
              </div>
              {showRarity && (
                <div
                  className="mt-1 inline-block text-[9px] font-orbitron uppercase tracking-widest px-1.5 py-0.5 rounded"
                  style={{ color: r.color, background: `${r.color}1a` }}
                >
                  {r.label}
                </div>
              )}
              {!e.unlocked && (
                <div className="mt-1.5">
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full"
                      style={{ width: `${e.percent}%`, background: r.gradient }}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-orbitron">
                    {Math.min(e.progress, e.target).toLocaleString()} / {e.target.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
