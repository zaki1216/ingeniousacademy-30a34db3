import { motion } from "framer-motion";
import { useEffect } from "react";
import logoAsset from "@/assets/ingenious-logo.webp.asset.json";

export function SplashScene({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="min-h-full grid place-items-center px-6 py-12">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="relative mx-auto h-32 w-32 md:h-40 md:w-40"
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(251,191,36,0.55), rgba(180,140,60,0.15) 55%, transparent 75%)",
              filter: "blur(14px)",
            }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative h-full w-full rounded-full bg-black/40 border border-amber-400/40 grid place-items-center overflow-hidden shadow-[0_0_60px_-10px_rgba(251,191,36,0.7)]">
            <img
              src={logoAsset.url}
              alt="Ingenious Academy"
              className="h-3/4 w-3/4 object-contain"
            />
          </div>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.9 }}
          className="mt-8 text-3xl md:text-5xl font-black tracking-[0.25em] bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600 bg-clip-text text-transparent"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          INGENIOUS ACADEMY
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.9 }}
          className="mt-3 text-sm md:text-base italic text-amber-200/70 tracking-widest"
        >
          The Academy of Endless Learning
        </motion.p>
      </div>
    </div>
  );
}
