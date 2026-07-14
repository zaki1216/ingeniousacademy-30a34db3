import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { ParticleField } from "./ParticleField";

type Props = {
  children: ReactNode;
  variant?: "night" | "office";
  particleDensity?: "low" | "med" | "high";
};

export function EntryStage({ children, variant = "night", particleDensity = "med" }: Props) {
  const isOffice = variant === "office";
  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        background: isOffice
          ? "radial-gradient(ellipse at top, #2b2418 0%, #12100b 55%, #06050a 100%)"
          : "radial-gradient(ellipse at 50% 30%, #1a1533 0%, #0a0818 55%, #030209 100%)",
      }}
    >
      {/* Warm vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isOffice
            ? "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.7) 100%)"
            : "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.75) 100%)",
        }}
      />
      {/* Moving cloud layer */}
      {!isOffice && (
        <>
          <motion.div
            className="absolute -inset-x-20 top-0 h-40 opacity-30"
            style={{
              background:
                "radial-gradient(ellipse, rgba(180,160,220,0.35), transparent 60%)",
              filter: "blur(20px)",
            }}
            animate={{ x: [0, 60, 0] }}
            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -inset-x-20 bottom-0 h-56 opacity-20"
            style={{
              background:
                "radial-gradient(ellipse, rgba(120,90,200,0.35), transparent 65%)",
              filter: "blur(30px)",
            }}
            animate={{ x: [0, -80, 0] }}
            transition={{ duration: 45, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
      <ParticleField
        density={particleDensity}
        color={isOffice ? "rgba(251,191,36,0.65)" : "rgba(200,190,255,0.7)"}
      />
      <div className="relative z-10 h-full w-full overflow-y-auto">{children}</div>
    </div>
  );
}
