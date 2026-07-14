import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

type Props = {
  density?: "low" | "med" | "high";
  color?: string;
  className?: string;
};

export function ParticleField({ density = "med", color = "rgba(251,191,36,0.7)", className }: Props) {
  const prefersReduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setIsMobile(mq.matches);
    const on = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const base = density === "high" ? 60 : density === "low" ? 18 : 40;
  const count = isMobile ? Math.round(base * 0.55) : base;

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`} aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const size = 1 + ((i * 7) % 3);
        const left = (i * 37) % 100;
        const top = (i * 71) % 100;
        const dur = 5 + ((i * 3) % 7);
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              background: color,
              boxShadow: `0 0 ${4 + size * 2}px ${color}`,
            }}
            animate={
              prefersReduced
                ? { opacity: [0.4, 0.8, 0.4] }
                : { y: [0, -20, 0], opacity: [0.2, 0.9, 0.2] }
            }
            transition={{ duration: dur, repeat: Infinity, delay: (i % 10) * 0.3, ease: "easeInOut" }}
          />
        );
      })}
    </div>
  );
}
