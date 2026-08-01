/**
 * AdventureMap — the signature learning surface.
 *
 * A gently curving adventure trail (Duolingo-style) that replaces the old
 * vertical lesson list. Purely presentational: it receives already-computed
 * nodes and reports clicks back. All progression rules stay in the existing
 * Continue Learning / Guardian / Curriculum engines.
 */

import { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Gift, Lock, Play, Shield, Sparkles, Star } from "lucide-react";

import {
  ADVENTURE_TERMS,
  NODE_LABEL,
  STATE_LABEL,
  type AdventureNode,
  type AdventureNodeKind,
  type AdventureNodeState,
} from "@/lib/adventure/terminology";
import { cn } from "@/lib/utils";

const ROW_H = 116; // px between node centres (mobile)
const ROW_H_MD = 140;
const AMPLITUDE = 26; // % horizontal sway from centre

/** Gentle S-curve: 0, +A, 0, -A, … */
function offsetFor(i: number) {
  return 50 + Math.sin((i * Math.PI) / 2) * AMPLITUDE;
}

const KIND_SIZE: Record<AdventureNodeKind, string> = {
  entrance: "h-14 w-14",
  quest: "h-16 w-16 md:h-[76px] md:w-[76px]",
  side_quest: "h-14 w-14",
  revision_quest: "h-14 w-14",
  bonus_quest: "h-14 w-14",
  event_quest: "h-14 w-14",
  master_trial: "h-[84px] w-[84px] md:h-24 md:w-24",
  knowledge_chest: "h-[84px] w-[84px] md:h-24 md:w-24",
};

function visualsFor(kind: AdventureNodeKind, state: AdventureNodeState) {
  if (state === "locked") {
    return { bg: "linear-gradient(160deg,#3f4657,#1b2030)", glow: "rgba(0,0,0,0.5)", ring: "rgba(255,255,255,0.18)" };
  }
  if (state === "completed") {
    return { bg: "linear-gradient(160deg,#34d399,#047857)", glow: "rgba(52,211,153,0.55)", ring: "rgba(209,250,229,0.6)" };
  }
  if (kind === "master_trial") {
    return { bg: "linear-gradient(160deg,#fb7185,#7f1d1d)", glow: "rgba(244,63,94,0.65)", ring: "rgba(254,205,211,0.6)" };
  }
  if (kind === "knowledge_chest") {
    return { bg: "linear-gradient(160deg,#fde68a,#b45309)", glow: "rgba(251,191,36,0.75)", ring: "rgba(254,243,199,0.7)" };
  }
  if (kind === "entrance") {
    return { bg: "linear-gradient(160deg,#94a3b8,#334155)", glow: "rgba(148,163,184,0.5)", ring: "rgba(255,255,255,0.4)" };
  }
  return { bg: "linear-gradient(160deg,#c4b5fd,#6d28d9)", glow: "rgba(167,139,250,0.7)", ring: "rgba(237,233,254,0.6)" };
}

function IconFor({ kind, state }: { kind: AdventureNodeKind; state: AdventureNodeState }) {
  const cls = "h-7 w-7 md:h-8 md:w-8 text-white drop-shadow";
  if (state === "locked") return <Lock className={cn(cls, "opacity-80")} />;
  if (state === "completed") return <Check className={cls} />;
  if (kind === "master_trial") return <Shield className={cls} />;
  if (kind === "knowledge_chest") return <Gift className={cls} />;
  if (kind === "entrance") return <Star className={cls} />;
  return <Play className={cn(cls, "fill-current")} />;
}

export function AdventureMap({
  nodes,
  onSelect,
  focusId,
  className,
}: {
  nodes: AdventureNode[];
  onSelect: (node: AdventureNode) => void;
  /** Node the map should scroll to / highlight on entry */
  focusId?: string | null;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrolledFor = useRef<string | null>(null);

  const isDesktop = typeof window !== "undefined" && window.matchMedia?.("(min-width: 768px)").matches;
  const rowH = isDesktop ? ROW_H_MD : ROW_H;

  const points = useMemo(
    () => nodes.map((n, i) => ({ id: n.id, x: offsetFor(i), y: 70 + i * rowH })),
    [nodes, rowH],
  );
  const totalHeight = points.length ? points[points.length - 1].y + 90 : 0;

  const path = useMemo(() => {
    if (points.length < 2) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const midY = (p0.y + p1.y) / 2;
      d += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [points]);

  // Highlight/scroll to the active node when the map opens or the target moves.
  useEffect(() => {
    if (!focusId || scrolledFor.current === focusId) return;
    const el = refs.current[focusId];
    if (!el) return;
    scrolledFor.current = focusId;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }, 250);
    return () => window.clearTimeout(t);
  }, [focusId, reduce, nodes.length]);

  if (nodes.length === 0) return null;

  return (
    <div
      className={cn("relative rounded-3xl border border-amber-400/20 overflow-hidden", className)}
      style={{
        background:
          "radial-gradient(120% 60% at 50% 0%, rgba(76,29,149,0.45) 0%, rgba(15,23,42,0.9) 60%, rgba(3,7,18,0.95) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 30px 80px -40px rgba(0,0,0,0.8)",
      }}
      role="list"
      aria-label={`${ADVENTURE_TERMS.dungeon} adventure map`}
    >
      <div className="text-center pt-4">
        <div className="text-[10px] uppercase tracking-[0.4em] text-amber-300 font-bold font-orbitron">
          Adventure Map
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-2xl px-3 pb-8" style={{ height: totalHeight }}>
        <svg
          className="absolute inset-0 w-full"
          height={totalHeight}
          viewBox={`0 0 100 ${totalHeight}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d={path}
            fill="none"
            stroke="rgba(251,191,36,0.28)"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray="0.2 14"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {nodes.map((n, i) => {
          const p = points[i];
          const v = visualsFor(n.kind, n.state);
          const clickable = !n.disabled;
          const pulsing = n.state === "current" || (n.kind === "knowledge_chest" && n.state === "available");

          return (
            <div
              key={n.id}
              role="listitem"
              ref={(el) => {
                refs.current[n.id] = el;
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${p.x}%`, top: p.y, width: "min(62%, 260px)" }}
            >
              <motion.button
                type="button"
                onClick={() => onSelect(n)}
                aria-label={`${NODE_LABEL[n.kind]}: ${n.title} — ${STATE_LABEL[n.state]}`}
                aria-current={n.state === "current" ? "step" : undefined}
                className={cn(
                  "relative grid place-items-center rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70",
                  KIND_SIZE[n.kind],
                  clickable ? "cursor-pointer" : "cursor-not-allowed",
                )}
                style={{
                  background: v.bg,
                  border: `3px solid ${v.ring}`,
                  boxShadow: `0 10px 22px rgba(0,0,0,0.55), 0 0 26px -4px ${v.glow}`,
                  opacity: n.state === "locked" ? 0.75 : 1,
                }}
                whileHover={clickable && !reduce ? { scale: 1.07 } : undefined}
                whileTap={clickable && !reduce ? { scale: 0.94 } : undefined}
                animate={
                  pulsing && !reduce
                    ? { boxShadow: [`0 0 0px ${v.glow}`, `0 0 34px ${v.glow}`, `0 0 0px ${v.glow}`] }
                    : undefined
                }
                transition={pulsing && !reduce ? { duration: 1.9, repeat: Infinity } : undefined}
              >
                <IconFor kind={n.kind} state={n.state} />

                {n.state === "current" && (
                  <span className="absolute -top-7 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest bg-amber-300 text-amber-950 whitespace-nowrap">
                    YOU ARE HERE
                  </span>
                )}

                {n.missionMarker && (
                  <span
                    className="absolute -right-1.5 -bottom-1 h-6 w-6 grid place-items-center rounded-full text-[11px] bg-black/80 border border-amber-300/70"
                    title={n.missionMarker}
                    aria-label={`Daily mission: ${n.missionMarker}`}
                  >
                    🎯
                  </span>
                )}
              </motion.button>

              {n.badge && (
                <div
                  className="mt-1.5 px-2 py-0.5 rounded-md text-[9px] font-black tracking-[0.18em] text-amber-100 whitespace-nowrap"
                  style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(251,191,36,0.35)" }}
                >
                  {n.badge}
                </div>
              )}
              <div className="mt-1 text-center max-w-full">
                <div className="text-[11px] md:text-xs font-bold text-amber-50 leading-tight line-clamp-2">
                  {n.title}
                </div>
                {n.subtitle && (
                  <div className="text-[10px] text-amber-100/60 leading-tight line-clamp-1">{n.subtitle}</div>
                )}
                {(n.xp || n.coins) && n.state !== "locked" && (
                  <div className="mt-1 flex items-center justify-center gap-1 text-[9px] text-amber-200/80">
                    {!!n.xp && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                        <Sparkles className="h-2.5 w-2.5" /> +{n.xp}
                      </span>
                    )}
                    {!!n.coins && (
                      <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">🪙 +{n.coins}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
