/**
 * HallRenderer — richly-decorated stone-hall interior variant.
 *
 * Renders any building whose `render.variant === "hall"`. Preserves the
 * original Mathematics Building visuals exactly (arched windows, floating
 * equations, dust particles, entrance doors, mentor bubble, dungeon gates).
 * Any building can opt into this variant and provide its own mentor and
 * theme via BuildingCurriculum.render.
 */

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import {
  Sparkles, Coins, Star, Trophy, Lock, DoorOpen, ChevronRight, X, BookOpen,
} from "lucide-react";

import type { BuildingCurriculum } from "@/lib/curriculum/types";
import type { EngineDungeon, EngineStats } from "@/lib/building/useBuildingData";

const DIFFICULTY_STARS = ["★", "★★", "★★★", "★★★★"];

export function HallRenderer({
  building,
  title,
  cadetName,
  dungeons,
  stats,
  onExit,
}: {
  building: BuildingCurriculum;
  title: string;
  cadetName: string;
  dungeons: EngineDungeon[];
  stats: EngineStats;
  onExit: () => void;
}) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const render = building.render!;
  const theme = render.theme;
  const mentor = render.mentor;
  void title; // interior title reserved for future variants

  const [entering, setEntering] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [targetDungeon, setTargetDungeon] = useState<{ id: string; name: string; subjectId: string } | null>(null);
  const [showLumi, setShowLumi] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntering(false), reduced ? 400 : 1600);
    return () => clearTimeout(t);
  }, [reduced]);

  useEffect(() => {
    if (!mentor?.welcome) return;
    try {
      const key = `${building.id}BuildingSeen`;
      const seen = sessionStorage.getItem(key);
      if (!seen) {
        const t = setTimeout(() => setShowLumi(true), 2000);
        return () => clearTimeout(t);
      }
    } catch { /* ignore */ }
  }, [building.id, mentor]);

  const dismissLumi = () => {
    setShowLumi(false);
    try { sessionStorage.setItem(`${building.id}BuildingSeen`, "1"); } catch { /* ignore */ }
  };

  function enterDungeon(id: string, name: string, subjectId: string) {
    if (targetDungeon) return;
    setTargetDungeon({ id, name, subjectId });
    setTimeout(() => {
      navigate({ to: "/app/journey/$worldId/$dungeonId", params: { worldId: subjectId, dungeonId: id } });
    }, reduced ? 350 : 950);
  }

  function handleExit() {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => onExit(), reduced ? 350 : 1100);
  }

  const mentorLine = useMemo(() => {
    if (!mentor?.line) return "";
    return mentor.line({
      cadetName,
      hasDungeons: dungeons.length > 0,
      recommendedName: stats.recommended?.name ?? null,
      cleared: stats.cleared,
      totalDungeons: stats.totalDungeons,
    });
  }, [mentor, cadetName, dungeons.length, stats]);

  return (
    <motion.div
      key={`hall-${building.id}`}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-0 z-50 overflow-hidden bg-black"
    >
      <HallEnvironment background={theme.background} />
      <FloatingEquations />
      <DustParticles />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: entering ? 0 : 1 }}
        transition={{ duration: 0.8 }}
        className="absolute inset-0 flex flex-col"
      >
        <div className="relative flex flex-wrap items-start justify-between gap-3 p-3 sm:p-4 md:p-6">
          <ExitBanner onExit={handleExit} />
          <div className="w-full sm:w-auto order-3 sm:order-none">
            <InfoPanel
              stats={stats}
              title={render.infoTitle ?? building.title}
              subtitle={render.infoSubtitle ?? building.subtitle}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-40">
          <DungeonGallery
            dungeons={dungeons}
            onEnter={(id, name, subjectId) => enterDungeon(id, name, subjectId)}
          />
        </div>

        {mentor && mentorLine && <MentorBubble mentor={mentor} line={mentorLine} />}

        <ObjectiveBar
          objective={stats.recommended}
          onEnter={(d) => enterDungeon(d.id, d.name, d.subjectId)}
        />

        <AnimatePresence>
          {showLumi && mentor?.welcome && (
            <LumiTooltip
              text={mentor.welcome(cadetName)}
              onDismiss={dismissLumi}
            />
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>{entering && <EntranceDoors />}</AnimatePresence>

      <AnimatePresence>
        {targetDungeon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md grid place-items-center"
          >
            <div className="text-center px-6">
              <div className="text-[10px] uppercase tracking-[0.4em] text-amber-300 font-bold">Approaching</div>
              <div className="mt-2 text-2xl md:text-4xl font-black font-serif text-amber-100">
                {targetDungeon.name}
              </div>
              <div className="mt-4 text-xs text-amber-100/60 animate-pulse">Preparing dungeon…</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {exiting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-40 bg-black grid place-items-center"
          >
            <div className="text-amber-200/80 text-sm tracking-[0.3em] uppercase">Returning to the Courtyard…</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------ Sub-components ------------------------------ */

function HallEnvironment({ background }: { background: string }) {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0" style={{ background }} />
      <div
        className="absolute bottom-0 inset-x-0 h-1/3"
        style={{
          background:
            "linear-gradient(to bottom, transparent, rgba(0,0,0,0.85)), repeating-linear-gradient(90deg, #2a1c10 0 60px, #1e140a 60px 120px)",
          transform: "perspective(600px) rotateX(55deg)",
          transformOrigin: "bottom",
        }}
      />
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <radialGradient id="sunBeam" cx="0.5" cy="0" r="0.8">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.15" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="stoneCol" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#3a2818" />
            <stop offset="1" stopColor="#1a0f08" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={`arch-${i}`}
            d={`M ${i * 320 + 40} 0 L ${i * 320 + 40} 180 Q ${i * 320 + 200} 40 ${i * 320 + 360} 180 L ${i * 320 + 360} 0 Z`}
            fill="#0f0904"
            opacity="0.9"
          />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <g key={`win-${i}`}>
            <rect x={200 + i * 380} y="100" width="120" height="220" fill="url(#sunBeam)" opacity="0.7" rx="60" />
            <path
              d={`M ${260 + i * 380} 320 L ${180 + i * 380} 700 L ${340 + i * 380} 700 Z`}
              fill="url(#sunBeam)"
              opacity="0.25"
            />
          </g>
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={`col-${i}`} x={i * 380 + 60} y="180" width="30" height="600" fill="url(#stoneCol)" />
        ))}
        {[0, 1, 2].map((i) => (
          <g key={`banner-${i}`} transform={`translate(${300 + i * 500}, 180)`}>
            <motion.path
              d="M 0 0 L 60 0 L 60 140 L 30 120 L 0 140 Z"
              fill="#7f1d1d"
              stroke="#fbbf24"
              strokeWidth="1.5"
              animate={{ skewX: [0, 1.5, 0, -1.5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            <text x="30" y="60" textAnchor="middle" fill="#fde68a" fontSize="22" fontWeight="900" fontFamily="serif">π</text>
            <text x="30" y="95" textAnchor="middle" fill="#fde68a" fontSize="14" fontWeight="700">∑</text>
          </g>
        ))}
        {[0, 1].map((side) => (
          <g key={`shelf-${side}`} transform={`translate(${side === 0 ? 20 : 1440}, 500)`}>
            {[0, 1, 2].map((row) => (
              <g key={row} transform={`translate(0, ${row * 60})`}>
                <rect width="140" height="50" fill="#2a1a0a" stroke="#3a2818" strokeWidth="1" />
                {[0, 1, 2, 3, 4, 5].map((b) => (
                  <rect
                    key={b}
                    x={5 + b * 22}
                    y="6"
                    width="18"
                    height="38"
                    fill={["#7f1d1d", "#78350f", "#1e3a8a", "#065f46", "#4c1d95", "#9a3412"][b]}
                  />
                ))}
              </g>
            ))}
          </g>
        ))}
        {[0, 1, 2, 3].map((i) => (
          <g key={`torch-${i}`} transform={`translate(${240 + i * 380}, 380)`}>
            <rect x="-3" y="0" width="6" height="40" fill="#3a2010" />
            <motion.ellipse
              cx="0" cy="-4" rx="8" ry="14" fill="#fbbf24"
              animate={{ ry: [14, 16, 13, 15, 14], opacity: [0.85, 1, 0.9, 1, 0.85] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{ filter: "blur(3px)" }}
            />
            <motion.ellipse
              cx="0" cy="-4" rx="4" ry="8" fill="#fef3c7"
              animate={{ ry: [8, 10, 7, 9, 8] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
          </g>
        ))}
      </svg>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 55%, transparent 30%, rgba(0,0,0,0.75) 100%)" }}
      />
    </div>
  );
}

const EQUATIONS = ["a² + b² = c²", "e^{iπ} + 1 = 0", "∫ x dx", "∑ n²", "π ≈ 3.14", "∂y/∂x", "φ = 1.618", "√2", "sin²+cos²=1", "lim n→∞"];

function FloatingEquations() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {EQUATIONS.map((eq, i) => (
        <motion.div
          key={i}
          className="absolute font-serif italic text-amber-200/25 select-none"
          style={{
            left: `${(i * 13 + 7) % 90}%`,
            top: `${(i * 19 + 11) % 80}%`,
            fontSize: `${14 + (i % 4) * 6}px`,
            textShadow: "0 0 12px rgba(251,191,36,0.35)",
          }}
          animate={{ y: [0, -20, 0, 15, 0], opacity: [0.15, 0.35, 0.2, 0.4, 0.15] }}
          transition={{ duration: 8 + (i % 5), repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
        >
          {eq}
        </motion.div>
      ))}
    </div>
  );
}

function DustParticles() {
  const particles = Array.from({ length: 40 });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-amber-200/40"
          style={{
            left: `${(i * 7.3) % 100}%`,
            top: `${(i * 11.7) % 100}%`,
            width: `${1 + (i % 3)}px`,
            height: `${1 + (i % 3)}px`,
            boxShadow: "0 0 6px rgba(251,191,36,0.6)",
          }}
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.7, 0.2] }}
          transition={{ duration: 6 + (i % 6), repeat: Infinity, delay: (i % 10) * 0.3 }}
        />
      ))}
    </div>
  );
}

function EntranceDoors() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="absolute inset-0 z-30 pointer-events-none"
    >
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: "-100%" }}
        transition={{ duration: 1.4, ease: [0.6, 0.05, 0.3, 0.95], delay: 0.2 }}
        className="absolute inset-y-0 left-0 w-1/2"
        style={{
          background: "linear-gradient(to right, #1a0f04 0%, #2a1a08 70%, #3a2410 100%)",
          borderRight: "3px solid #78350f",
          boxShadow: "inset -20px 0 40px rgba(0,0,0,0.9)",
        }}
      >
        <div className="absolute right-4 top-1/2 -translate-y-1/2 h-16 w-3 bg-amber-400/60 rounded-full" style={{ boxShadow: "0 0 20px #fbbf24" }} />
      </motion.div>
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: "100%" }}
        transition={{ duration: 1.4, ease: [0.6, 0.05, 0.3, 0.95], delay: 0.2 }}
        className="absolute inset-y-0 right-0 w-1/2"
        style={{
          background: "linear-gradient(to left, #1a0f04 0%, #2a1a08 70%, #3a2410 100%)",
          borderLeft: "3px solid #78350f",
          boxShadow: "inset 20px 0 40px rgba(0,0,0,0.9)",
        }}
      >
        <div className="absolute left-4 top-1/2 -translate-y-1/2 h-16 w-3 bg-amber-400/60 rounded-full" style={{ boxShadow: "0 0 20px #fbbf24" }} />
      </motion.div>
    </motion.div>
  );
}

function ExitBanner({ onExit }: { onExit: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onExit}
      className="group relative flex items-center gap-2 rounded-full pl-2 pr-3 sm:pr-4 py-1.5 border border-amber-400/30 bg-black/60 backdrop-blur-md text-amber-100 hover:border-amber-400/70 transition-colors"
      style={{ boxShadow: "0 8px 24px -8px rgba(0,0,0,0.8)" }}
    >
      <span className="h-6 w-6 sm:h-7 sm:w-7 rounded-full grid place-items-center bg-amber-500/20 border border-amber-400/40">
        <DoorOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </span>
      <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase font-serif">
        <span className="sm:hidden">Back</span>
        <span className="hidden sm:inline">Return to Courtyard</span>
      </span>
    </motion.button>
  );
}

function InfoPanel({
  stats,
  title,
  subtitle,
}: {
  stats: EngineStats;
  title: string;
  subtitle: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="relative rounded-2xl border border-amber-400/25 bg-gradient-to-br from-black/70 to-stone-950/80 backdrop-blur-md px-3 sm:px-4 py-3 text-amber-100 w-full sm:min-w-[260px] sm:w-auto"
      style={{ boxShadow: "0 20px 60px -20px rgba(251,191,36,0.35), inset 0 1px 0 rgba(255,255,255,0.08)" }}
    >
      <div className="text-[9px] uppercase tracking-[0.35em] text-amber-300/80 font-bold">{title}</div>
      <div className="mt-0.5 font-serif text-lg font-black leading-tight">{subtitle}</div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
        <StatRow label="Completion" value={`${stats.pct}%`} />
        <StatRow label="Dungeons" value={`${stats.cleared}/${stats.totalDungeons}`} />
        <StatRow label="Quests" value={`${stats.passedQuests}/${stats.totalQuests}`} />
        <StatRow label="Status" value={stats.pct === 100 ? "Mastered" : "In Progress"} />
      </div>

      <div className="mt-2 h-1.5 rounded-full bg-black/50 overflow-hidden border border-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${stats.pct}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.8 }}
          className="h-full"
          style={{ background: "linear-gradient(90deg,#fbbf24,#f97316)" }}
        />
      </div>
    </motion.div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-amber-200/60 uppercase tracking-wider text-[9px]">{label}</span>
      <span className="font-bold font-serif text-amber-50">{value}</span>
    </div>
  );
}

function DungeonGallery({
  dungeons,
  onEnter,
}: {
  dungeons: EngineDungeon[];
  onEnter: (id: string, name: string, subjectId: string) => void;
}) {
  if (!dungeons.length) {
    return (
      <div className="mt-16 mx-auto max-w-md rounded-2xl border border-amber-400/25 bg-black/50 backdrop-blur p-6 text-center text-amber-100/70">
        <BookOpen className="h-8 w-8 mx-auto mb-2 text-amber-300" />
        <div className="font-serif text-lg font-bold">The Hall Awaits</div>
        <p className="text-xs mt-1">No dungeons have been prepared yet. Return soon.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-6 mt-2">
        <div className="text-[10px] uppercase tracking-[0.4em] text-amber-300 font-bold">Dungeon Gallery</div>
        <h2 className="mt-1 font-serif text-2xl md:text-3xl font-black text-amber-50" style={{ textShadow: "0 4px 20px rgba(251,191,36,0.35)" }}>
          Choose Your Path
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dungeons.map((d, i) => (
          <DungeonGate key={d.id} dungeon={d} index={i} onEnter={() => onEnter(d.id, d.name, d.subjectId)} />
        ))}
      </div>
    </div>
  );
}

function DungeonGate({
  dungeon: d,
  index,
  onEnter,
}: {
  dungeon: EngineDungeon;
  index: number;
  onEnter: () => void;
}) {
  const locked = !d.unlocked;
  const stars = DIFFICULTY_STARS[d.difficulty] ?? "★";

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 + 0.5 }}
      whileHover={locked ? {} : { scale: 1.03, y: -4 }}
      whileTap={locked ? {} : { scale: 0.98 }}
      onClick={locked ? undefined : onEnter}
      disabled={locked}
      className="group relative text-left rounded-2xl overflow-hidden border border-amber-400/30 disabled:cursor-not-allowed"
      style={{
        background: "linear-gradient(160deg, rgba(30,20,10,0.9), rgba(10,6,3,0.95))",
        boxShadow: locked
          ? "0 10px 30px -10px rgba(0,0,0,0.9)"
          : "0 20px 50px -15px rgba(251,191,36,0.45), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}
    >
      <div className="relative h-40 overflow-hidden">
        <svg viewBox="0 0 240 160" className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id={`gateGlow-${d.id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={locked ? "#3f3f46" : "#fbbf24"} stopOpacity="0.9" />
              <stop offset="100%" stopColor={locked ? "#18181b" : "#7c2d12"} stopOpacity="1" />
            </linearGradient>
          </defs>
          <path d="M 40 155 L 40 80 Q 120 10 200 80 L 200 155 Z" fill={`url(#gateGlow-${d.id})`} />
          <path d="M 60 155 L 60 90 Q 120 30 180 90 L 180 155 Z" fill="#000" opacity={locked ? 0.9 : 0.75} />
          <text
            x="120" y="115" textAnchor="middle"
            fontSize="42" fontWeight="900" fontFamily="serif"
            fill={locked ? "#52525b" : "#fbbf24"}
            style={{ filter: locked ? "none" : "drop-shadow(0 0 12px rgba(251,191,36,0.8))" }}
          >
            {d.number ?? "?"}
          </text>
          {locked && (
            <>
              <line x1="60" y1="80" x2="180" y2="80" stroke="#71717a" strokeWidth="4" strokeDasharray="6 4" />
              <line x1="80" y1="60" x2="160" y2="130" stroke="#52525b" strokeWidth="3" strokeDasharray="5 3" />
            </>
          )}
          {!locked && [0, 1].map((s) => (
            <motion.ellipse
              key={s}
              cx={s === 0 ? 42 : 198}
              cy="70"
              rx="4"
              ry="10"
              fill="#fef3c7"
              animate={{ ry: [10, 12, 9, 11, 10] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ filter: "blur(1.5px)" }}
            />
          ))}
        </svg>

        {d.bossCleared && (
          <div className="absolute top-2 right-2 h-7 px-2 rounded-full bg-amber-500/25 border border-amber-400/60 flex items-center gap-1 text-[10px] font-black text-amber-200">
            <Trophy className="h-3 w-3" /> CLEARED
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-[0.3em] font-bold text-amber-300/80">
              ⚔ Dungeon {String(d.number ?? index + 1).padStart(2, "0")}
            </div>
            <div className="font-serif text-lg font-black text-amber-50 truncate">{d.name}</div>
          </div>
          <div className="text-amber-400 text-xs font-bold shrink-0" title={`Difficulty ${d.difficulty + 1}`}>
            {stars}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-amber-200/70 mb-1">
            <span>Progress</span>
            <span className="font-bold text-amber-100">{d.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-black/50 overflow-hidden border border-white/10">
            <div
              className="h-full transition-all"
              style={{ width: `${d.pct}%`, background: "linear-gradient(90deg,#fbbf24,#f97316,#ef4444)" }}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-3 text-amber-100/80">
            <span className="inline-flex items-center gap-1"><Coins className="h-3 w-3 text-yellow-400" /> {d.rewardCoins}</span>
            <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 text-sky-300" /> {d.rewardXp}</span>
            <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3 text-purple-300" /> Badge</span>
          </div>
          {locked ? (
            <span className="inline-flex items-center gap-1 text-zinc-400 font-bold text-[10px] uppercase tracking-wider">
              <Lock className="h-3 w-3" /> Sealed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-300 font-bold text-[10px] uppercase tracking-wider group-hover:text-amber-100 transition-colors">
              Enter <ChevronRight className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>

      {!locked && !d.bossCleared && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          animate={{ opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{ boxShadow: "inset 0 0 40px rgba(251,191,36,0.4)" }}
        />
      )}
    </motion.button>
  );
}

function MentorBubble({
  mentor,
  line,
}: {
  mentor: NonNullable<BuildingCurriculum["render"]>["mentor"];
  line: string;
}) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 8000);
    return () => clearTimeout(t);
  }, [line]);

  if (!mentor) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.2, duration: 0.8 }}
      className="pointer-events-none absolute left-3 md:left-8 bottom-32 md:bottom-40 flex items-end gap-3 z-20"
    >
      <div className="pointer-events-auto relative">
        <svg width="90" height="140" viewBox="0 0 90 140">
          <path d="M 20 60 Q 45 55 70 60 L 78 130 L 12 130 Z" fill="#4c1d95" stroke="#312e81" strokeWidth="1.5" />
          <path d="M 30 130 L 45 100 L 60 130" stroke="#fbbf24" strokeWidth="2" fill="none" />
          <circle cx="45" cy="38" r="16" fill="#f5d0a9" stroke="#7c5230" strokeWidth="1" />
          <path d="M 25 30 L 45 8 L 65 30 Z" fill="#1e1b4b" stroke="#fbbf24" strokeWidth="1.2" />
          <rect x="27" y="28" width="36" height="5" fill="#312e81" />
          <path d="M 34 46 Q 45 60 56 46 Q 55 55 45 58 Q 35 55 34 46" fill="#f5f5f4" opacity="0.95" />
          <circle cx="40" cy="38" r="1.4" fill="#1c1917" />
          <circle cx="50" cy="38" r="1.4" fill="#1c1917" />
          <motion.g animate={{ y: [0, -1.5, 0] }} transition={{ duration: 3, repeat: Infinity }}>
            <rect x="55" y="72" width="18" height="14" fill="#7f1d1d" stroke="#fbbf24" strokeWidth="0.8" />
            <line x1="64" y1="72" x2="64" y2="86" stroke="#fbbf24" strokeWidth="0.5" />
          </motion.g>
          <motion.circle
            cx="45" cy="70" r="42"
            fill="none" stroke="#fbbf24" strokeWidth="0.5"
            animate={{ opacity: [0.15, 0.4, 0.15], r: [40, 46, 40] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        </svg>
      </div>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            className="pointer-events-auto relative max-w-[280px] mb-14 rounded-2xl border border-amber-400/40 bg-black/80 backdrop-blur px-4 py-3 text-amber-50"
            style={{ boxShadow: "0 20px 40px -12px rgba(0,0,0,0.9), 0 0 20px rgba(251,191,36,0.25)" }}
          >
            <div className="text-[9px] uppercase tracking-[0.3em] text-amber-300 font-bold">{mentor.name}</div>
            <div className="mt-1 text-sm font-serif italic">{line}</div>
            <div className="absolute left-0 bottom-4 -translate-x-2 h-3 w-3 rotate-45 bg-black/80 border-l border-b border-amber-400/40" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ObjectiveBar({
  objective,
  onEnter,
}: {
  objective: EngineDungeon | null;
  onEnter: (d: EngineDungeon) => void;
}) {
  if (!objective) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.7 }}
      className="pointer-events-none absolute inset-x-0 bottom-3 sm:bottom-6 flex justify-center px-3 sm:px-4 z-20"
    >
      <div
        className="pointer-events-auto relative w-full max-w-xl rounded-2xl border border-amber-400/40 bg-gradient-to-r from-black/85 via-stone-950/85 to-black/85 backdrop-blur-md p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3"
        style={{ boxShadow: "0 20px 60px -15px rgba(251,191,36,0.45), inset 0 1px 0 rgba(255,255,255,0.1)" }}
      >
        <div className="min-w-0 flex-1">
          <div className="text-[9px] uppercase tracking-[0.4em] text-amber-300 font-bold">Current Objective</div>
          <div className="font-serif text-base sm:text-lg font-black text-amber-50 break-words leading-tight">
            ⚔ Continue {objective.name}
          </div>
          {objective.nextQuest !== null && (
            <div className="text-[11px] text-amber-100/70">
              Learning Quest {String(objective.nextQuest).padStart(2, "0")}
            </div>
          )}
        </div>
        <button
          onClick={() => onEnter(objective)}
          className="w-full sm:w-auto shrink-0 relative overflow-hidden rounded-xl px-4 py-2.5 text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-black transition-transform hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg,#fde68a,#f59e0b,#c2410c)",
            boxShadow: "0 8px 20px -6px rgba(251,191,36,0.7), inset 0 1px 0 rgba(255,255,255,0.55)",
          }}
        >
          Enter Dungeon
        </button>
      </div>
    </motion.div>
  );
}

function LumiTooltip({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="absolute right-4 bottom-32 md:bottom-40 z-30 max-w-[280px]"
    >
      <div className="relative rounded-2xl border border-cyan-300/50 bg-gradient-to-br from-slate-900/90 to-indigo-950/90 backdrop-blur p-4 text-cyan-50"
        style={{ boxShadow: "0 20px 40px -10px rgba(6,182,212,0.35)" }}
      >
        <button onClick={onDismiss} className="absolute top-1.5 right-1.5 text-cyan-200/60 hover:text-cyan-100">
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-2 mb-1">
          <motion.div
            animate={{ y: [0, -3, 0], rotate: [0, 6, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="h-8 w-8 rounded-full grid place-items-center"
            style={{ background: "radial-gradient(circle,#7dd3fc,#0369a1)", boxShadow: "0 0 20px #38bdf8" }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </motion.div>
          <div className="text-[9px] uppercase tracking-[0.3em] text-cyan-200 font-bold">Lumi</div>
        </div>
        <div className="text-xs leading-relaxed">{text}</div>
      </div>
    </motion.div>
  );
}
