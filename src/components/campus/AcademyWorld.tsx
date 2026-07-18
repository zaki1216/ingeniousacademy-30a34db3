import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useCampusLayout } from "@/lib/campus/useCampusLayout";
import type { PlacedBuilding } from "@/lib/campus/layoutEngine";
import type { BuildingKind } from "@/lib/campus/buildings";

// Local alias so the rest of this file keeps its familiar `Building` name.
type Building = PlacedBuilding;
export type { BuildingKind };

/* -------------------------------- Component ------------------------------- */
export function AcademyWorld() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { user } = useAuth();
  const { buildings: BUILDINGS, playerHome: PLAYER_HOME, isMobile } = useCampusLayout();
  const [target, setTarget] = useState<Building | null>(null);
  const [entering, setEntering] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const profile = useQuery({
    queryKey: ["world-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (
        await supabase
          .from("profiles")
          .select("name, equipped_avatar, standard_id")
          .eq("id", user!.id)
          .maybeSingle()
      ).data,
    staleTime: 60_000,
  });

  const standardId = profile.data?.standard_id;

  const subjects = useQuery({
    queryKey: ["world-subjects", standardId],
    enabled: !!standardId,
    queryFn: async () =>
      (await supabase.from("subjects").select("id, subject_name").eq("standard_id", standardId!)).data ?? [],
    staleTime: 60_000,
  });

  const resolveRoute = useMemo(
    () => (b: Building): string => {
      if (b.locked) return "";
      if (b.route) return b.route;
      // Math building has a dedicated immersive interior scene.
      if (b.kind === "math") return "/app/building/math";
      const list = subjects.data ?? [];
      const found = list.find((s) =>
        (b.match ?? []).some((kw) => (s.subject_name ?? "").toLowerCase().includes(kw)),
      );
      return found ? `/app/journey/${found.id}` : "/app/journey";
    },
    [subjects.data],
  );

  const avatar = (profile.data?.equipped_avatar as string) || "🧑‍🎓";
  const playerPos = target ?? { x: PLAYER_HOME.x, y: PLAYER_HOME.y };

  const handleEnter = (b: Building) => {
    if (target || b.locked) return;
    setTarget(b);
    setTimeout(() => setEntering(true), reduced ? 300 : 1400);
    setTimeout(
      () => {
        const to = resolveRoute(b);
        if (to) navigate({ to: to as never });
      },
      reduced ? 700 : 2200,
    );
  };

  return (
    <div className="relative w-full">
      <div
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-400/15 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.9)]"
        style={{
          aspectRatio: isMobile ? "3 / 5" : "16 / 10",
          minHeight: isMobile ? 560 : 520,
        }}
      >
        <Sky />
        <CloudLayer />
        <MountainsFar />
        <MountainsNear />
        <Birds />
        <Grounds />
        <Paths />
        <GardensAndFountain />
        <Trees />
        <Torches />

        {/* Buildings */}
        {BUILDINGS.map((b, i) => (
          <BuildingSprite
            key={b.id}
            b={b}
            index={i}
            hovered={hovered === b.id}
            focused={target?.id === b.id}
            disabled={!!target}
            onEnter={() => handleEnter(b)}
            onHover={(v) => setHovered(v ? b.id : null)}
          />
        ))}

        {/* Ambient NPCs */}
        <Mentor x={40} y={82} delay={0} tint="#f9a8d4" />
        <Mentor x={65} y={83} delay={2} tint="#93c5fd" />
        <Mentor x={20} y={68} delay={4} tint="#fcd34d" />

        {/* Player + Lumi (below buildings for depth via z; still visible on plaza) */}
        <PlayerAndLumi pos={playerPos} avatar={avatar} traveling={!!target} />

        {/* Sparkle particles */}
        <Sparkles />

        {/* Travel label */}
        <AnimatePresence>
          {target && (
            <motion.div
              key="travel"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur border border-amber-300/40 text-xs font-black text-amber-100 tracking-[0.25em]"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              APPROACHING {target.name.toUpperCase()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fade transition into building */}
        <AnimatePresence>
          {entering && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 z-40 bg-black"
            />
          )}
        </AnimatePresence>

        {/* Vignette */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(0,0,0,0.55) 100%)",
          }}
        />
      </div>
    </div>
  );
}

/* --------------------------------- Layers --------------------------------- */
function Sky() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(180deg, #f6b56b 0%, #d97a5a 20%, #6d3b7a 45%, #2a1f4a 70%, #0e0b2a 100%)",
      }}
    />
  );
}

function CloudLayer() {
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
}

function MountainsFar() {
  return (
    <svg className="absolute left-0 right-0 w-full" style={{ top: "30%", height: "16%" }} viewBox="0 0 1000 160" preserveAspectRatio="none">
      <path d="M0,140 L100,60 L220,110 L340,40 L470,110 L590,55 L720,120 L840,50 L960,110 L1000,80 L1000,160 L0,160 Z" fill="#3c2c58" opacity="0.7" />
    </svg>
  );
}
function MountainsNear() {
  return (
    <svg className="absolute left-0 right-0 w-full" style={{ top: "38%", height: "14%" }} viewBox="0 0 1000 140" preserveAspectRatio="none">
      <path d="M0,120 L140,40 L260,90 L420,20 L560,90 L720,40 L860,90 L1000,60 L1000,140 L0,140 Z" fill="#231a3d" opacity="0.9" />
    </svg>
  );
}

function Grounds() {
  return (
    <>
      {/* Distant hills */}
      <div
        className="absolute inset-x-0"
        style={{
          bottom: "50%",
          height: "8%",
          background: "linear-gradient(180deg,#3e2e5a,#1a1230)",
          transform: "translateY(2px)",
        }}
      />
      {/* Grass */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: "50%",
          background:
            "linear-gradient(180deg,#3e6b3a 0%, #2a5a2f 30%, #163b1e 100%)",
        }}
      />
      {/* Plaza */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: "2%",
          width: "70%",
          height: "18%",
          background:
            "radial-gradient(ellipse at 50% 100%, #8a7355 0%, #6a5540 50%, transparent 75%)",
          filter: "blur(0.5px)",
        }}
      />
    </>
  );
}

function Paths() {
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
}

function GardensAndFountain() {
  return (
    <>
      {/* Fountain */}
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

      {/* Garden bushes */}
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
}

function Trees() {
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
}

function Torches() {
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
}

function Birds() {
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
}

function Sparkles() {
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
}

/* --------------------------------- NPCs ---------------------------------- */
function Mentor({ x, y, delay, tint }: { x: number; y: number; delay: number; tint: string }) {
  return (
    <motion.div
      className="absolute z-[8] pointer-events-none"
      style={{ top: `${y}%` }}
      initial={{ left: `${x - 5}%` }}
      animate={{ left: [`${x - 5}%`, `${x + 5}%`, `${x - 5}%`] }}
      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay }}
    >
      <motion.div
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 0.4, repeat: Infinity }}
      >
        <svg width="18" height="26" viewBox="0 0 18 26">
          <circle cx="9" cy="5" r="4" fill="#f5d0a9" />
          <path d="M4,12 L14,12 L15,24 L3,24 Z" fill={tint} />
          <rect x="7" y="24" width="2" height="2" fill="#1a1024" />
          <rect x="10" y="24" width="2" height="2" fill="#1a1024" />
        </svg>
      </motion.div>
    </motion.div>
  );
}

/* -------------------------------- Player --------------------------------- */
function PlayerAndLumi({
  pos,
  avatar,
  traveling,
}: {
  pos: { x: number; y: number };
  avatar: string;
  traveling: boolean;
}) {
  return (
    <motion.div
      className="absolute z-[15] pointer-events-none"
      initial={false}
      animate={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      transition={{ duration: 1.4, ease: "easeInOut" }}
      style={{ transform: "translate(-50%, -100%)" }}
    >
      <div className="relative flex items-end gap-2">
        {/* Lumi orb */}
        <motion.div
          className="absolute -left-6 -top-3"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div
            className="h-4 w-4 rounded-full"
            style={{
              background: "radial-gradient(circle, #e0f2fe 0%, #7dd3fc 40%, #4f46e5 100%)",
              boxShadow: "0 0 14px rgba(125,211,252,0.9), 0 0 24px rgba(129,140,248,0.6)",
            }}
          />
        </motion.div>

        <motion.div
          animate={traveling ? { y: [0, -3, 0] } : { y: [0, -1, 0] }}
          transition={{ duration: traveling ? 0.35 : 2.2, repeat: Infinity }}
          className="relative"
        >
          <div
            className="h-14 w-14 rounded-full grid place-items-center text-3xl relative"
            style={{
              background: "linear-gradient(135deg,#a78bfa,#ec4899)",
              boxShadow: "0 10px 24px rgba(0,0,0,0.55), 0 0 28px rgba(167,139,250,0.6)",
              border: "2px solid rgba(255,255,255,0.6)",
            }}
          >
            {avatar}
          </div>
          {/* Cape */}
          <motion.div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-4 w-8 rounded-b-full"
            style={{ background: "linear-gradient(180deg,#7c1d24,#3b0d12)" }}
            animate={{ rotate: [-3, 3, -3] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Shadow */}
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-10 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(0,0,0,0.55), transparent 70%)" }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ------------------------------ Buildings ------------------------------- */
function BuildingSprite({
  b,
  index,
  hovered,
  focused,
  disabled,
  onEnter,
  onHover,
}: {
  b: Building;
  index: number;
  hovered: boolean;
  focused: boolean;
  disabled: boolean;
  onEnter: () => void;
  onHover: (v: boolean) => void;
}) {
  return (
    <motion.button
      type="button"
      disabled={disabled || b.locked}
      onClick={onEnter}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, scale: focused ? 1.08 : 1 }}
      transition={{ delay: 0.1 + index * 0.06, duration: 0.5 }}
      whileHover={!disabled && !b.locked ? { y: -4 } : {}}
      className="absolute z-10 focus:outline-none disabled:cursor-not-allowed"
      style={{
        left: `${b.x}%`,
        top: `${b.y}%`,
        transform: `translate(-50%, -100%) scale(${b.scale ?? 1})`,
      }}
      aria-label={b.name}
    >
      <div className="relative flex flex-col items-center">
        <div
          className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-0 group transition-opacity"
          style={{
            opacity: hovered || focused ? 1 : 0,
            background: "radial-gradient(circle, rgba(251,191,36,0.35), transparent 70%)",
            transform: "translateY(20%) scale(1.4)",
            filter: "blur(6px)",
          }}
        />
        <BuildingArt kind={b.kind} open={focused} locked={!!b.locked} />
        <NameTag name={b.name} tag={b.tag} locked={!!b.locked} visible={hovered || focused} />
      </div>
    </motion.button>
  );
}

function NameTag({ name, tag, locked, visible }: { name: string; tag: string; locked: boolean; visible: boolean }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: visible ? 1 : 0.55, y: visible ? -2 : 0 }}
      className="mt-1 flex flex-col items-center pointer-events-none"
    >
      <div
        className="px-2 py-0.5 rounded-md text-[9px] md:text-[10px] font-black tracking-widest text-white whitespace-nowrap"
        style={{
          background: locked ? "rgba(60,60,60,0.7)" : "rgba(0,0,0,0.6)",
          backdropFilter: "blur(6px)",
          border: `1px solid ${locked ? "rgba(255,255,255,0.15)" : "rgba(251,191,36,0.35)"}`,
          fontFamily: "'Cinzel', serif",
        }}
      >
        {locked ? `🔒 ${name.toUpperCase()}` : name.toUpperCase()}
      </div>
      <div className="text-[9px] text-amber-100/70 tracking-wide whitespace-nowrap">{tag}</div>
    </motion.div>
  );
}

function BuildingArt({ kind, open, locked }: { kind: BuildingKind; open: boolean; locked: boolean }) {
  const doorOpen = open ? 60 : 0;
  const commonBanner = (
    <>
      <path d="M-4,-6 L-4,4 L-2,3 L0,4 L0,-6 Z" fill="#7f1d1d" />
      <circle cx="-2" cy="-2" r="1" fill="#fbbf24" />
    </>
  );
  const doorGroup = (color = "#3a2214") => (
    <g style={{ transformOrigin: "center", transform: `perspective(80px) rotateY(${doorOpen}deg)`, transition: "transform 1.2s ease-in-out" }}>
      <rect x="-6" y="-14" width="12" height="18" fill={color} stroke="#78350f" strokeWidth="0.6" />
      <circle cx="4" cy="-5" r="0.6" fill="#fbbf24" />
    </g>
  );

  const svgProps = {
    width: 96, height: 96, viewBox: "-40 -70 80 74",
    style: { filter: locked ? "grayscale(0.7) brightness(0.7)" : "drop-shadow(0 8px 14px rgba(0,0,0,0.55))" },
  } as const;

  switch (kind) {
    case "math":
      return (
        <svg {...svgProps}>
          <rect x="-22" y="-40" width="44" height="40" fill="#3b5aa8" stroke="#1e3a7a" strokeWidth="0.8" />
          <polygon points="-24,-40 0,-58 24,-40" fill="#1e3a7a" />
          <rect x="-6" y="-14" width="12" height="14" fill="#0f1e40" />
          {doorGroup("#1e3a7a")}
          <rect x="-16" y="-32" width="6" height="8" fill="#fde68a" opacity="0.7" />
          <rect x="10" y="-32" width="6" height="8" fill="#fde68a" opacity="0.7" />
          <rect x="-16" y="-20" width="6" height="6" fill="#fde68a" opacity="0.6" />
          <rect x="10" y="-20" width="6" height="6" fill="#fde68a" opacity="0.6" />
          <text x="0" y="-45" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fde68a">π</text>
          <g transform="translate(-14,-38)">{commonBanner}</g>
          <g transform="translate(14,-38)">{commonBanner}</g>
        </svg>
      );
    case "science":
      return (
        <svg {...svgProps}>
          <rect x="-22" y="-36" width="44" height="36" fill="#0f5f3f" stroke="#053a24" strokeWidth="0.8" />
          <ellipse cx="0" cy="-38" rx="18" ry="12" fill="#0a4a30" />
          <ellipse cx="0" cy="-40" rx="8" ry="4" fill="#34d399" opacity="0.75">
            <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2s" repeatCount="indefinite" />
          </ellipse>
          {doorGroup("#0a4a30")}
          <rect x="-16" y="-28" width="6" height="7" fill="#a7f3d0" opacity="0.7" />
          <rect x="10" y="-28" width="6" height="7" fill="#a7f3d0" opacity="0.7" />
          <circle cx="-14" cy="-8" r="2" fill="#34d399" opacity="0.8">
            <animate attributeName="cy" values="-8;-4;-8" dur="1.6s" repeatCount="indefinite" />
          </circle>
        </svg>
      );
    case "library":
      return (
        <svg {...svgProps}>
          <rect x="-24" y="-42" width="48" height="42" fill="#8a5a1a" stroke="#4a2f0a" strokeWidth="0.8" />
          <polygon points="-26,-42 0,-54 26,-42" fill="#b45309" />
          <rect x="-6" y="-14" width="12" height="14" fill="#3a1f08" />
          {doorGroup("#3a1f08")}
          <rect x="-20" y="-36" width="8" height="10" fill="#fde68a" opacity="0.75" />
          <rect x="12" y="-36" width="8" height="10" fill="#fde68a" opacity="0.75" />
          <rect x="-8" y="-32" width="16" height="6" fill="#fde68a" opacity="0.6" />
          <text x="0" y="-46" textAnchor="middle" fontSize="8" fontWeight="900" fill="#78350f">📚</text>
        </svg>
      );
    case "merchant":
      return (
        <svg {...svgProps}>
          <rect x="-22" y="-32" width="44" height="32" fill="#a16207" stroke="#4a2f0a" strokeWidth="0.8" />
          <polygon points="-24,-32 0,-46 24,-32" fill="#7a4a10" />
          <rect x="-24" y="-24" width="48" height="6" fill="#c026d3" stroke="#6b1478" strokeWidth="0.4" />
          {[-16, -8, 0, 8, 16].map((x, i) => (
            <line key={i} x1={x} y1="-24" x2={x} y2="-18" stroke="#4a1153" strokeWidth="0.3" />
          ))}
          {doorGroup("#5a3410")}
          <rect x="8" y="-14" width="10" height="10" fill="#3a1f08" />
          <circle cx="13" cy="-9" r="1.5" fill="#fcd34d" />
          <text x="0" y="-36" textAnchor="middle" fontSize="6" fontWeight="900" fill="#fde68a">SHOP</text>
        </svg>
      );
    case "arena":
      return (
        <svg {...svgProps}>
          <ellipse cx="0" cy="-4" rx="26" ry="6" fill="#8a5a3a" />
          <rect x="-24" y="-32" width="48" height="30" fill="#a16b3a" stroke="#5a3418" strokeWidth="0.8" />
          {[-18, -6, 6, 18].map((x) => (
            <rect key={x} x={x - 3} y="-24" width="6" height="10" fill="#5a3418" rx="3" />
          ))}
          <rect x="-24" y="-38" width="48" height="6" fill="#7a4820" />
          {[-18, -6, 6, 18].map((x, i) => (
            <path key={i} d={`M${x - 2},-38 L${x},-42 L${x + 2},-38 Z`} fill="#7f1d1d" />
          ))}
          {doorGroup("#3a1f08")}
        </svg>
      );
    case "hall":
      return (
        <svg {...svgProps}>
          <rect x="-24" y="-38" width="48" height="6" fill="#fbbf24" />
          <polygon points="-26,-38 0,-52 26,-38" fill="#f59e0b" />
          <circle cx="0" cy="-46" r="2.5" fill="#fef3c7" />
          {[-16, -8, 0, 8, 16].map((x, i) => (
            <rect key={i} x={x - 2} y="-32" width="4" height="30" fill="#fef3c7" stroke="#c79a2b" strokeWidth="0.3" />
          ))}
          <rect x="-24" y="-4" width="48" height="4" fill="#fbbf24" />
          {doorGroup("#78350f")}
          <text x="0" y="-42" textAnchor="middle" fontSize="4" fontWeight="900" fill="#78350f">HALL OF FAME</text>
        </svg>
      );
    case "residence":
      return (
        <svg {...svgProps}>
          <rect x="-20" y="-28" width="40" height="28" fill="#c78f5a" stroke="#5a3418" strokeWidth="0.8" />
          <polygon points="-22,-28 0,-42 22,-28" fill="#7a3a1a" />
          {doorGroup("#5a3418")}
          <rect x="-14" y="-22" width="8" height="8" fill="#fde68a">
            <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" />
          </rect>
          <rect x="6" y="-22" width="8" height="8" fill="#fde68a">
            <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" />
          </rect>
          <rect x="-2" y="-36" width="4" height="8" fill="#5a3418" />
          <circle cx="0" cy="-38" r="1.5" fill="#f97316" opacity="0.9" />
        </svg>
      );
    case "future":
      return (
        <svg {...svgProps}>
          <polygon points="0,-52 -12,0 12,0" fill="#1a1230" stroke="#6b21a8" strokeWidth="1" />
          <circle cx="0" cy="-40" r="4" fill="#a78bfa" opacity="0.9">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <text x="0" y="-14" textAnchor="middle" fontSize="4" fontWeight="900" fill="#c4b5fd">SOON</text>
        </svg>
      );
  }
}
