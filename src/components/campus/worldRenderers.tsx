import { memo } from "react";
import { motion } from "framer-motion";

/**
 * Renderers for static/ambient world objects. These are extracted from
 * the original AcademyWorld component with no visual changes — the
 * WorldEngine dispatches by key so future objects can plug in without
 * touching the engine or AcademyWorld.
 *
 * Static renderers (no animation) are wrapped in React.memo so they
 * never re-render when interactive state (target/hovered/etc.) changes.
 * Animated renderers rely on framer-motion's own animation loop.
 */

export const Sky = memo(function Sky() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(180deg, #f6b56b 0%, #d97a5a 20%, #6d3b7a 45%, #2a1f4a 70%, #0e0b2a 100%)",
      }}
    />
  );
});

export const CloudLayer = memo(function CloudLayer() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => {
        const top = 4 + i * 3;
        const dur = 60 + i * 20;
        return (
          <motion.div
            key={i}
            className="absolute h-8 md:h-10 rounded-full blur-md opacity-70"
            style={{
              top: `${top}%`,
              width: `${20 + (i % 3) * 8}%`,
              background: "radial-gradient(ellipse, rgba(255,220,180,0.7), transparent 70%)",
            }}
            initial={{ left: "-30%" }}
            animate={{ left: "130%" }}
            transition={{ duration: dur, repeat: Infinity, ease: "linear", delay: -i * 8 }}
          />
        );
      })}
    </>
  );
});

export const MountainsFar = memo(function MountainsFar() {
  return (
    <svg className="absolute left-0 right-0 w-full" style={{ top: "30%", height: "16%" }} viewBox="0 0 1000 160" preserveAspectRatio="none">
      <path d="M0,140 L100,60 L220,110 L340,40 L470,110 L590,55 L720,120 L840,50 L960,110 L1000,80 L1000,160 L0,160 Z" fill="#3c2c58" opacity="0.7" />
    </svg>
  );
});

export const MountainsNear = memo(function MountainsNear() {
  return (
    <svg className="absolute left-0 right-0 w-full" style={{ top: "38%", height: "14%" }} viewBox="0 0 1000 140" preserveAspectRatio="none">
      <path d="M0,120 L140,40 L260,90 L420,20 L560,90 L720,40 L860,90 L1000,60 L1000,140 L0,140 Z" fill="#231a3d" opacity="0.9" />
    </svg>
  );
});

export const Grounds = memo(function Grounds() {
  return (
    <>
      <div
        className="absolute inset-x-0"
        style={{
          bottom: "50%",
          height: "8%",
          background: "linear-gradient(180deg,#3e2e5a,#1a1230)",
          transform: "translateY(2px)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: "50%",
          background: "linear-gradient(180deg,#3e6b3a 0%, #2a5a2f 30%, #163b1e 100%)",
        }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: "2%",
          width: "70%",
          height: "18%",
          background: "radial-gradient(ellipse at 50% 100%, #8a7355 0%, #6a5540 50%, transparent 75%)",
          filter: "blur(0.5px)",
        }}
      />
    </>
  );
});

export const Paths = memo(function Paths() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="path" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(212,190,150,0.55)" />
          <stop offset="100%" stopColor="rgba(212,190,150,0.15)" />
        </linearGradient>
      </defs>
      <path d="M50,92 Q50,80 30,74 Q18,68 12,60" stroke="url(#path)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M50,92 Q45,80 30,58" stroke="url(#path)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M50,92 L50,52" stroke="url(#path)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M50,92 Q55,80 70,58" stroke="url(#path)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M50,92 Q60,80 87,64" stroke="url(#path)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M50,92 Q35,88 22,80" stroke="url(#path)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M50,92 Q65,88 78,80" stroke="url(#path)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
});

export const GardensAndFountain = memo(function GardensAndFountain() {
  return (
    <>
      <div
        className="absolute z-[5]"
        style={{ left: "50%", bottom: "7%", transform: "translate(-50%, 0)" }}
      >
        <svg width="70" height="60" viewBox="0 0 70 60">
          <ellipse cx="35" cy="52" rx="30" ry="6" fill="#4a3820" />
          <ellipse cx="35" cy="48" rx="26" ry="5" fill="#65502e" />
          <ellipse cx="35" cy="46" rx="22" ry="4" fill="#7fa8d4" opacity="0.85" />
          <rect x="33" y="20" width="4" height="26" fill="#8a7355" />
          <circle cx="35" cy="18" r="6" fill="#a68a63" />
          <motion.circle
            cx="35" cy="12" r="3" fill="#c9e6ff" opacity="0.85"
            animate={{ cy: [12, 8, 12], opacity: [0.85, 0.4, 0.85] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          />
        </svg>
      </div>

      {[
        { x: 40, y: 88 }, { x: 60, y: 88 }, { x: 33, y: 92 }, { x: 67, y: 92 },
      ].map((g, i) => (
        <div key={i} className="absolute" style={{ left: `${g.x}%`, top: `${g.y}%`, transform: "translate(-50%,-50%)" }}>
          <svg width="40" height="22" viewBox="0 0 40 22">
            <ellipse cx="20" cy="14" rx="18" ry="7" fill="#1f4a24" />
            <ellipse cx="14" cy="10" rx="7" ry="5" fill="#2d6b32" />
            <ellipse cx="26" cy="10" rx="7" ry="5" fill="#2d6b32" />
            <circle cx="12" cy="8" r="1.5" fill="#f472b6" />
            <circle cx="28" cy="9" r="1.5" fill="#fcd34d" />
            <circle cx="20" cy="6" r="1.5" fill="#f9a8d4" />
          </svg>
        </div>
      ))}
    </>
  );
});

export const Trees = memo(function Trees() {
  const trees = [
    { x: 4, y: 68 }, { x: 96, y: 68 },
    { x: 6, y: 82 }, { x: 94, y: 82 },
    { x: 15, y: 90 }, { x: 85, y: 90 },
    { x: 42, y: 62 }, { x: 58, y: 62 },
  ];
  return (
    <>
      {trees.map((t, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: `${t.x}%`, top: `${t.y}%`, transform: "translate(-50%,-100%)" }}
          animate={{ rotate: [-1, 1, -1] }}
          transition={{ duration: 4 + (i % 3), repeat: Infinity, ease: "easeInOut" }}
        >
          <svg width="46" height="60" viewBox="0 0 46 60">
            <rect x="20" y="34" width="6" height="22" fill="#3a2418" rx="1" />
            <circle cx="23" cy="26" r="18" fill="#1f3d24" />
            <circle cx="15" cy="20" r="10" fill="#2d5a32" />
            <circle cx="31" cy="22" r="11" fill="#2d5a32" />
          </svg>
        </motion.div>
      ))}
    </>
  );
});

export const Torches = memo(function Torches() {
  const torches = [
    { x: 26, y: 90 }, { x: 74, y: 90 },
    { x: 38, y: 94 }, { x: 62, y: 94 },
  ];
  return (
    <>
      {torches.map((t, i) => (
        <div key={i} className="absolute" style={{ left: `${t.x}%`, top: `${t.y}%`, transform: "translate(-50%,-100%)" }}>
          <svg width="14" height="30" viewBox="0 0 14 30">
            <rect x="6" y="12" width="2" height="18" fill="#3a2418" />
            <motion.circle
              cx="7" cy="10" r="4" fill="#fbbf24"
              animate={{ r: [4, 5, 4], opacity: [0.9, 1, 0.9] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
              style={{ filter: "drop-shadow(0 0 6px rgba(251,191,36,0.9))" }}
            />
          </svg>
        </div>
      ))}
    </>
  );
});

export const Birds = memo(function Birds() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.svg
          key={i}
          className="absolute"
          style={{ top: `${8 + i * 5}%` }}
          width="30" height="10" viewBox="0 0 30 10"
          initial={{ left: "-8%" }}
          animate={{ left: "110%" }}
          transition={{ duration: 30 + i * 10, repeat: Infinity, ease: "linear", delay: -i * 8 }}
        >
          <motion.path
            d="M0,5 Q5,0 10,5 Q15,0 20,5 Q25,0 30,5"
            fill="none" stroke="#1a1024" strokeWidth="1.5" strokeLinecap="round"
            animate={{ d: ["M0,5 Q5,0 10,5 Q15,0 20,5 Q25,0 30,5", "M0,5 Q5,3 10,5 Q15,3 20,5 Q25,3 30,5"] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        </motion.svg>
      ))}
    </>
  );
});

export const Sparkles = memo(function Sparkles() {
  return (
    <>
      {Array.from({ length: 14 }).map((_, i) => {
        const left = (i * 37 + 5) % 100;
        const dur = 6 + ((i * 3) % 5);
        return (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-amber-200"
            style={{ left: `${left}%`, boxShadow: "0 0 8px rgba(253,224,71,0.95)" }}
            initial={{ bottom: "-4%", opacity: 0 }}
            animate={{ bottom: "60%", opacity: [0, 1, 1, 0] }}
            transition={{ duration: dur, repeat: Infinity, delay: (i * 0.5) % 5, ease: "linear" }}
          />
        );
      })}
    </>
  );
});

export const Vignette = memo(function Vignette() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(0,0,0,0.55) 100%)",
      }}
    />
  );
});

/** Registry keyed by WorldObject.renderer. */
export const worldRenderers: Record<string, React.ComponentType> = {
  sky: Sky,
  clouds: CloudLayer,
  mountainsFar: MountainsFar,
  mountainsNear: MountainsNear,
  grounds: Grounds,
  paths: Paths,
  gardensAndFountain: GardensAndFountain,
  trees: Trees,
  torches: Torches,
  birds: Birds,
  sparkles: Sparkles,
  vignette: Vignette,
};
