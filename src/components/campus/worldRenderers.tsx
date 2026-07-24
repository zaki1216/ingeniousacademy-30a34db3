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

/* ------------------------- New ambient / decor ------------------------- */

export const LightRays = memo(function LightRays() {
  return (
    <div
      className="pointer-events-none absolute inset-0 mix-blend-screen"
      style={{
        background:
          "conic-gradient(from 210deg at 60% 15%, transparent 0deg, rgba(253,224,71,0.10) 8deg, transparent 20deg, rgba(253,224,71,0.08) 30deg, transparent 45deg)",
        maskImage: "linear-gradient(180deg, black 0%, black 55%, transparent 85%)",
        WebkitMaskImage: "linear-gradient(180deg, black 0%, black 55%, transparent 85%)",
      }}
    />
  );
});

export const Banners = memo(function Banners() {
  const banners = [
    { x: 12, y: 46 }, { x: 88, y: 46 }, { x: 30, y: 44 }, { x: 70, y: 44 },
  ];
  return (
    <>
      {banners.map((b, i) => (
        <div key={i} className="absolute" style={{ left: `${b.x}%`, top: `${b.y}%`, transform: "translate(-50%,-100%)" }}>
          <svg width="18" height="34" viewBox="0 0 18 34">
            <rect x="8" y="0" width="2" height="34" fill="#3a2418" />
            <motion.path
              d="M10,4 L18,6 L16,12 L18,18 L10,20 Z"
              fill="#7f1d1d"
              stroke="#fbbf24"
              strokeWidth="0.4"
              animate={{ d: [
                "M10,4 L18,6 L16,12 L18,18 L10,20 Z",
                "M10,4 L17,7 L18,12 L17,17 L10,20 Z",
                "M10,4 L18,6 L16,12 L18,18 L10,20 Z",
              ] }}
              transition={{ duration: 3 + (i % 2), repeat: Infinity, ease: "easeInOut" }}
            />
            <circle cx="14" cy="12" r="1.4" fill="#fbbf24" />
          </svg>
        </div>
      ))}
    </>
  );
});

export const Lanterns = memo(function Lanterns() {
  const lanterns = [
    { x: 20, y: 60 }, { x: 80, y: 60 }, { x: 50, y: 58 },
  ];
  return (
    <>
      {lanterns.map((l, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: `${l.x}%`, top: `${l.y}%`, transform: "translate(-50%,-50%)" }}
          animate={{ rotate: [-2, 2, -2] }}
          transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg width="16" height="22" viewBox="0 0 16 22">
            <line x1="8" y1="0" x2="8" y2="4" stroke="#3a2418" strokeWidth="0.6" />
            <rect x="3" y="4" width="10" height="12" rx="2" fill="#7a4820" stroke="#3a2418" strokeWidth="0.4" />
            <motion.rect
              x="5" y="6" width="6" height="8" rx="1" fill="#fbbf24"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
              style={{ filter: "drop-shadow(0 0 4px rgba(251,191,36,0.9))" }}
            />
          </svg>
        </motion.div>
      ))}
    </>
  );
});

export const FlowerBeds = memo(function FlowerBeds() {
  const beds = [
    { x: 25, y: 86 }, { x: 75, y: 86 }, { x: 45, y: 94 }, { x: 55, y: 94 },
  ];
  const petals = ["#f472b6", "#fcd34d", "#f9a8d4", "#a5f3fc", "#fda4af"];
  return (
    <>
      {beds.map((b, i) => (
        <div key={i} className="absolute" style={{ left: `${b.x}%`, top: `${b.y}%`, transform: "translate(-50%,-50%)" }}>
          <svg width="32" height="14" viewBox="0 0 32 14">
            <ellipse cx="16" cy="10" rx="14" ry="3.5" fill="#2a1a10" />
            {[4, 10, 16, 22, 28].map((cx, j) => (
              <circle key={j} cx={cx} cy={7 - (j % 2)} r="1.6" fill={petals[(i + j) % petals.length]} />
            ))}
          </svg>
        </div>
      ))}
    </>
  );
});

export const Bushes = memo(function Bushes() {
  const bushes = [
    { x: 10, y: 74 }, { x: 90, y: 74 }, { x: 22, y: 96 }, { x: 78, y: 96 },
  ];
  return (
    <>
      {bushes.map((b, i) => (
        <div key={i} className="absolute" style={{ left: `${b.x}%`, top: `${b.y}%`, transform: "translate(-50%,-50%)" }}>
          <svg width="28" height="14" viewBox="0 0 28 14">
            <ellipse cx="8" cy="9" rx="7" ry="5" fill="#1f4a24" />
            <ellipse cx="18" cy="9" rx="8" ry="5" fill="#2d6b32" />
            <ellipse cx="24" cy="10" rx="4" ry="3" fill="#1f4a24" />
          </svg>
        </div>
      ))}
    </>
  );
});

export const Benches = memo(function Benches() {
  const benches = [
    { x: 32, y: 90 }, { x: 68, y: 90 },
  ];
  return (
    <>
      {benches.map((b, i) => (
        <div key={i} className="absolute" style={{ left: `${b.x}%`, top: `${b.y}%`, transform: "translate(-50%,-50%)" }}>
          <svg width="22" height="10" viewBox="0 0 22 10">
            <rect x="1" y="2" width="20" height="2" rx="1" fill="#7a4820" />
            <rect x="2" y="4" width="2" height="5" fill="#3a2418" />
            <rect x="18" y="4" width="2" height="5" fill="#3a2418" />
          </svg>
        </div>
      ))}
    </>
  );
});

export const Signboards = memo(function Signboards() {
  const signs = [
    { x: 8, y: 82, label: "N" }, { x: 92, y: 82, label: "S" },
  ];
  return (
    <>
      {signs.map((s, i) => (
        <div key={i} className="absolute" style={{ left: `${s.x}%`, top: `${s.y}%`, transform: "translate(-50%,-100%)" }}>
          <svg width="20" height="26" viewBox="0 0 20 26">
            <rect x="9" y="10" width="2" height="16" fill="#3a2418" />
            <rect x="2" y="4" width="16" height="8" rx="1" fill="#7a4820" stroke="#3a2418" strokeWidth="0.5" />
            <text x="10" y="10" textAnchor="middle" fontSize="6" fontWeight="900" fill="#fde68a" fontFamily="'Cinzel', serif">
              {s.label}
            </text>
          </svg>
        </div>
      ))}
    </>
  );
});

export const Butterflies = memo(function Butterflies() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => {
        const baseX = 35 + i * 15;
        const baseY = 78 + (i % 2) * 4;
        const tint = ["#f9a8d4", "#fcd34d", "#a5f3fc"][i];
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: `${baseX}%`, top: `${baseY}%` }}
            animate={{
              x: [0, 10, -6, 8, 0],
              y: [0, -8, -4, -10, 0],
            }}
            transition={{ duration: 12 + i * 3, repeat: Infinity, ease: "easeInOut", delay: i * 1.5 }}
          >
            <motion.svg
              width="10" height="8" viewBox="0 0 10 8"
              animate={{ scaleX: [1, 0.3, 1] }}
              transition={{ duration: 0.3, repeat: Infinity }}
            >
              <ellipse cx="3" cy="4" rx="3" ry="2.5" fill={tint} opacity="0.9" />
              <ellipse cx="7" cy="4" rx="3" ry="2.5" fill={tint} opacity="0.9" />
              <rect x="4.6" y="3" width="0.8" height="3" fill="#1a1024" />
            </motion.svg>
          </motion.div>
        );
      })}
    </>
  );
});

export const DriftingLeaves = memo(function DriftingLeaves() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => {
        const left = (i * 23 + 8) % 100;
        const dur = 14 + (i * 3) % 6;
        return (
          <motion.span
            key={i}
            className="absolute"
            style={{ left: `${left}%`, top: "-4%", fontSize: 10 }}
            animate={{
              top: ["-4%", "104%"],
              x: [0, 20, -10, 25, 0],
              rotate: [0, 180, 360],
            }}
            transition={{ duration: dur, repeat: Infinity, ease: "linear", delay: i * 2 }}
          >
            <svg width="8" height="10" viewBox="0 0 8 10">
              <path d="M4,0 Q8,4 4,10 Q0,4 4,0 Z" fill="#7a4820" opacity="0.75" />
            </svg>
          </motion.span>
        );
      })}
    </>
  );
});

export const Fireflies = memo(function Fireflies() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => {
        const left = (i * 41 + 12) % 100;
        const top = 55 + ((i * 13) % 35);
        const dur = 4 + (i % 4);
        return (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              background: "#fef08a",
              boxShadow: "0 0 6px rgba(253,224,71,0.95), 0 0 12px rgba(253,224,71,0.6)",
            }}
            animate={{
              x: [0, 12, -8, 6, 0],
              y: [0, -10, 4, -6, 0],
              opacity: [0.2, 1, 0.4, 1, 0.2],
            }}
            transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay: (i % 5) * 0.4 }}
          />
        );
      })}
    </>
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
  lightRays: LightRays,
  banners: Banners,
  lanterns: Lanterns,
  flowerBeds: FlowerBeds,
  bushes: Bushes,
  benches: Benches,
  signboards: Signboards,
  butterflies: Butterflies,
  driftingLeaves: DriftingLeaves,
  fireflies: Fireflies,
};
