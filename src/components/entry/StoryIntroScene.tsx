import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const LINES = [
  "Long ago...",
  "...the greatest scholars founded an Academy...",
  "...where knowledge became strength...",
  "...where every lesson became an adventure...",
  "...today, a new Cadet arrives.",
];

export function StoryIntroScene({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(reduced ? LINES.length : 0);

  useEffect(() => {
    if (reduced) return;
    if (step >= LINES.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), 1400);
    return () => clearTimeout(t);
  }, [step, reduced]);

  const complete = step >= LINES.length;

  return (
    <div className="min-h-full grid place-items-center px-6 py-16 relative">
      <button
        onClick={onDone}
        className="absolute top-6 right-6 text-xs uppercase tracking-widest text-amber-200/60 hover:text-amber-200 transition"
      >
        Skip ›
      </button>
      <div className="max-w-2xl text-center space-y-6" style={{ fontFamily: "'Cinzel', serif" }}>
        {LINES.map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: i < step ? 1 : 0, y: i < step ? 0 : 12 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="text-xl md:text-2xl text-amber-100/90 italic"
          >
            {line}
          </motion.p>
        ))}
      </div>
      {complete && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <Button
            onClick={onDone}
            className="bg-gradient-to-b from-amber-400 to-amber-700 text-amber-950 hover:brightness-110 font-bold tracking-widest px-8"
          >
            CONTINUE
          </Button>
        </motion.div>
      )}
    </div>
  );
}
