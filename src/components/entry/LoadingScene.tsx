import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { LumiAvatar } from "@/components/lumi/LumiAvatar";
import { ACADEMY_TIPS } from "@/lib/entry/tips";

export function LoadingScene({ onDone, minMs = 2400 }: { onDone: () => void; minMs?: number }) {
  const [tipIdx, setTipIdx] = useState(0);

  useEffect(() => {
    const rot = setInterval(() => setTipIdx((i) => (i + 1) % ACADEMY_TIPS.length), 1100);
    const done = setTimeout(onDone, minMs);
    return () => {
      clearInterval(rot);
      clearTimeout(done);
    };
  }, [onDone, minMs]);

  return (
    <div className="min-h-full grid place-items-center px-6 py-16">
      <div className="text-center">
        <div className="relative mx-auto h-40 w-40">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-amber-400/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            style={{ boxShadow: "0 0 40px rgba(251,191,36,0.25)" }}
          />
          <motion.div
            className="absolute inset-3 rounded-full border border-amber-200/30"
            animate={{ rotate: -360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 grid place-items-center">
            <LumiAvatar size="xl" />
          </div>
        </div>
        <p className="mt-8 text-xs uppercase tracking-[0.4em] text-amber-300/70">Lumi whispers</p>
        <div className="mt-3 h-12 max-w-md mx-auto grid place-items-center">
          <motion.p
            key={tipIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="text-base md:text-lg text-amber-100 italic"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            "{ACADEMY_TIPS[tipIdx]}"
          </motion.p>
        </div>
      </div>
    </div>
  );
}
