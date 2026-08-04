import { Crown, Star } from "lucide-react";

import type { DormHero } from "@/lib/dorm/config";

/** Hero Showcase wall — the student's personal Hall of Fame. */
export function HeroShowcaseWall({ hero }: { hero: DormHero }) {
  const frameStyle = hero.frame ? { background: hero.frame } : { background: "var(--gradient-monarch)" };
  return (
    <div className="rune-border holo-card p-4 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 10% -10%, color-mix(in oklab, #f59e0b 22%, transparent), transparent 55%)",
        }}
      />
      <div className="relative flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 rounded-2xl p-[3px]" style={frameStyle}>
          <div className="h-full w-full rounded-[14px] bg-[var(--bg-void)] grid place-items-center text-4xl">
            {hero.avatar || "🧑‍🎓"}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-orbitron font-bold tracking-[0.22em] uppercase text-amber-300 flex items-center gap-1.5">
            <Crown className="h-3 w-3" /> {hero.title || "Academy Hero"}
          </div>
          <div className="text-lg font-extrabold truncate">{hero.name}</div>
          <div className="text-xs text-muted-foreground font-orbitron truncate">
            {hero.username ? `@${hero.username}` : "@cadet"} · Level {hero.level}
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {hero.rankName && (
              <span
                className="text-[11px] font-bold rounded-full px-2 py-0.5 border"
                style={{
                  color: hero.rankColor ?? "#fcd34d",
                  borderColor: `${hero.rankColor ?? "#fcd34d"}55`,
                  background: `${hero.rankColor ?? "#fcd34d"}18`,
                }}
              >
                {hero.rankIcon} {hero.rankName}
              </span>
            )}
            <span className="text-[11px] rounded-full px-2 py-0.5 bg-white/5 border border-white/10 flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-300" />
              {hero.badge || "No badge yet"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
