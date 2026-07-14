import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg" | "xl";
const SIZES: Record<Size, { box: string; core: string; eye: string }> = {
  sm: { box: "h-9 w-9",  core: "h-6 w-6",  eye: "h-1 w-1" },
  md: { box: "h-14 w-14", core: "h-9 w-9",  eye: "h-1.5 w-1.5" },
  lg: { box: "h-24 w-24", core: "h-16 w-16", eye: "h-2 w-2" },
  xl: { box: "h-36 w-36", core: "h-24 w-24", eye: "h-2.5 w-2.5" },
};

export function LumiAvatar({
  size = "md",
  className,
  awake = true,
}: {
  size?: Size;
  className?: string;
  awake?: boolean;
}) {
  const s = SIZES[size];
  return (
    <motion.div
      className={cn("relative grid place-items-center shrink-0", s.box, className)}
      animate={awake ? { y: [0, -4, 0, 3, 0] } : undefined}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Aura */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(180,220,255,0.55), rgba(120,90,255,0.25) 55%, transparent 75%)",
          filter: "blur(6px)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Orbit ring */}
      <motion.div
        className="absolute inset-0 rounded-full border border-white/25"
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        style={{
          boxShadow: "inset 0 0 12px rgba(180, 220, 255, 0.4)",
        }}
      />
      {/* Core orb */}
      <div
        className={cn("relative rounded-full", s.core)}
        style={{
          background:
            "radial-gradient(circle at 30% 30%, #ffffff 0%, #a5c8ff 35%, #6d5cff 70%, #2a1b6b 100%)",
          boxShadow:
            "0 0 22px rgba(140, 170, 255, 0.75), inset 0 0 12px rgba(255,255,255,0.55)",
        }}
      >
        {/* Face */}
        <div className="absolute inset-0 flex items-center justify-center gap-1.5">
          <div className={cn("rounded-full bg-white shadow", s.eye)} />
          <div className={cn("rounded-full bg-white shadow", s.eye)} />
        </div>
        {/* Sparkle */}
        <div
          className="absolute -top-1 -right-1 text-[10px]"
          style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.8))" }}
        >
          ✦
        </div>
      </div>
    </motion.div>
  );
}
