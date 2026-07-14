import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { playSfx } from "@/lib/entry/sfx";

export function AcademyGateScene({ onEntered }: { onEntered: () => void }) {
  const reduced = useReducedMotion();
  const [opening, setOpening] = useState(false);

  const handleEnter = () => {
    if (opening) return;
    playSfx("gate-open");
    setOpening(true);
    setTimeout(onEntered, reduced ? 400 : 1800);
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-10 relative">
      <motion.div
        animate={opening ? { scale: reduced ? 1 : 1.6, opacity: reduced ? 0 : 0.4 } : {}}
        transition={{ duration: 1.6, ease: "easeIn" }}
        style={{ perspective: 1400 }}
        className="relative"
      >
        <GateSvg opening={opening} reduced={!!reduced} />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: opening ? 0 : 1, y: 0 }}
        transition={{ duration: 0.9 }}
        className="mt-8 text-2xl md:text-3xl tracking-[0.3em] text-amber-200"
        style={{ fontFamily: "'Cinzel', serif" }}
      >
        THE ACADEMY GATE
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: opening ? 0 : 1 }}
        className="mt-2 text-sm italic text-amber-200/60"
      >
        Every great scholar once stood where you stand now.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: opening ? 0 : 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="mt-8"
      >
        <Button
          onClick={handleEnter}
          disabled={opening}
          className="bg-gradient-to-b from-amber-300 via-amber-500 to-amber-800 text-amber-950 hover:brightness-110 font-bold tracking-[0.25em] px-10 py-6 text-base shadow-[0_0_40px_-8px_rgba(251,191,36,0.7)]"
        >
          ENTER THE ACADEMY
        </Button>
      </motion.div>
    </div>
  );
}

function GateSvg({ opening, reduced }: { opening: boolean; reduced: boolean }) {
  const openL = opening ? (reduced ? 0 : -78) : 0;
  const openR = opening ? (reduced ? 0 : 78) : 0;
  const openOpacity = opening && reduced ? 0 : 1;

  return (
    <svg
      viewBox="0 0 400 480"
      className="w-[320px] h-[380px] md:w-[440px] md:h-[520px] drop-shadow-[0_20px_40px_rgba(0,0,0,0.7)]"
    >
      <defs>
        <linearGradient id="stone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a4a3a" />
          <stop offset="100%" stopColor="#2a2018" />
        </linearGradient>
        <linearGradient id="door" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2818" />
          <stop offset="100%" stopColor="#1a1008" />
        </linearGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(251,191,36,0.9)" />
          <stop offset="100%" stopColor="rgba(251,191,36,0)" />
        </radialGradient>
      </defs>

      {/* Inner glow behind doors */}
      <ellipse cx="200" cy="280" rx="120" ry="180" fill="url(#glow)" opacity={opening ? 1 : 0.35} style={{ transition: "opacity 1.2s" }} />

      {/* Ground */}
      <rect x="0" y="440" width="400" height="40" fill="#1a140c" />
      <rect x="0" y="438" width="400" height="4" fill="#3a2a1a" />

      {/* Left pillar */}
      <rect x="40" y="80" width="60" height="380" fill="url(#stone)" />
      <rect x="30" y="70" width="80" height="20" fill="#4a3a2a" />
      {/* Right pillar */}
      <rect x="300" y="80" width="60" height="380" fill="url(#stone)" />
      <rect x="290" y="70" width="80" height="20" fill="#4a3a2a" />

      {/* Arch */}
      <path d="M 40 80 Q 200 -30 360 80 L 360 110 Q 200 10 40 110 Z" fill="url(#stone)" />
      <path d="M 40 80 Q 200 -30 360 80" fill="none" stroke="url(#gold)" strokeWidth="3" />

      {/* Keystone emblem */}
      <circle cx="200" cy="60" r="18" fill="url(#gold)" stroke="#78350f" strokeWidth="2" />
      <text x="200" y="66" textAnchor="middle" fontSize="18" fontWeight="900" fill="#3a2418" fontFamily="Cinzel, serif">IA</text>

      {/* Banners */}
      <path d="M 70 100 L 70 200 L 90 190 L 110 200 L 110 100 Z" fill="#7f1d1d" opacity={openOpacity} />
      <path d="M 290 100 L 290 200 L 310 190 L 330 200 L 330 100 Z" fill="#7f1d1d" opacity={openOpacity} />
      <circle cx="90" cy="140" r="8" fill="url(#gold)" opacity={openOpacity} />
      <circle cx="310" cy="140" r="8" fill="url(#gold)" opacity={openOpacity} />

      {/* Torches */}
      <rect x="16" y="200" width="8" height="40" fill="#3a2418" />
      <circle cx="20" cy="196" r="10" fill="#fbbf24">
        <animate attributeName="r" values="10;12;10" dur="1.2s" repeatCount="indefinite" />
      </circle>
      <rect x="376" y="200" width="8" height="40" fill="#3a2418" />
      <circle cx="380" cy="196" r="10" fill="#fbbf24">
        <animate attributeName="r" values="10;12;10" dur="1.2s" repeatCount="indefinite" />
      </circle>

      {/* Doors with hinge animation */}
      <g style={{ transformOrigin: "100px 260px", transform: `rotateY(${openL}deg)`, transformBox: "fill-box", transition: reduced ? "opacity 0.6s" : "transform 1.8s ease-in-out" }}>
        <rect x="100" y="110" width="100" height="330" fill="url(#door)" stroke="#78350f" strokeWidth="2" />
        <rect x="115" y="130" width="70" height="80" fill="none" stroke="url(#gold)" strokeWidth="1.5" />
        <rect x="115" y="220" width="70" height="80" fill="none" stroke="url(#gold)" strokeWidth="1.5" />
        <rect x="115" y="310" width="70" height="80" fill="none" stroke="url(#gold)" strokeWidth="1.5" />
        <circle cx="190" cy="270" r="4" fill="url(#gold)" />
      </g>
      <g style={{ transformOrigin: "300px 260px", transform: `rotateY(${openR}deg)`, transformBox: "fill-box", transition: reduced ? "opacity 0.6s" : "transform 1.8s ease-in-out" }}>
        <rect x="200" y="110" width="100" height="330" fill="url(#door)" stroke="#78350f" strokeWidth="2" />
        <rect x="215" y="130" width="70" height="80" fill="none" stroke="url(#gold)" strokeWidth="1.5" />
        <rect x="215" y="220" width="70" height="80" fill="none" stroke="url(#gold)" strokeWidth="1.5" />
        <rect x="215" y="310" width="70" height="80" fill="none" stroke="url(#gold)" strokeWidth="1.5" />
        <circle cx="210" cy="270" r="4" fill="url(#gold)" />
      </g>

      {/* Trees */}
      <ellipse cx="15" cy="440" rx="25" ry="12" fill="#0a0806" />
      <ellipse cx="385" cy="440" rx="25" ry="12" fill="#0a0806" />
    </svg>
  );
}
