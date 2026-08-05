import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

/**
 * Academy Graduation Ceremony — a short (≈12s), elegant, skippable moment
 * triggered the first time a subject graduation enters the student's legacy.
 * Purely cosmetic: no XP, coins or progress are involved.
 */
export function GraduationCeremony({
  subject,
  avatar,
  studentName,
  title,
  onClose,
}: {
  subject: string;
  avatar: string;
  studentName: string;
  title: string | null;
  onClose: () => void;
}) {
  const [act, setAct] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setAct(1), 3200),
      setTimeout(() => setAct(2), 6800),
      setTimeout(() => onClose(), 13000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[130] grid place-items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-label="Academy Graduation Ceremony"
      >
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

        {/* Courtyard */}
        <div className="relative w-[94%] max-w-2xl rune-border holo-card overflow-hidden">
          <div className="relative aspect-[16/10] sm:aspect-[16/9]">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg,#1b1633 0%,#2a2150 55%,#161228 100%)",
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 15%, rgba(251,191,36,0.28), transparent 60%)",
              }}
            />
            {/* Academy banner */}
            <motion.div
              initial={{ y: -80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              className="absolute left-1/2 -translate-x-1/2 top-0 w-[42%] max-w-[220px] rounded-b-xl px-3 py-3 text-center"
              style={{ background: "linear-gradient(180deg,#7c2d12,#b45309)" }}
            >
              <div className="text-[9px] font-orbitron tracking-[0.35em] uppercase text-amber-100/90">
                Ingenious
              </div>
              <div className="text-sm font-extrabold text-amber-50">ACADEMY</div>
            </motion.div>

            {/* Floor */}
            <div className="absolute inset-x-0 bottom-0 h-[26%] bg-[linear-gradient(180deg,#3f3364,#241d3a)]" />

            {/* Hero walking in */}
            <motion.div
              initial={{ x: "-70%", opacity: 0 }}
              animate={{ x: "0%", opacity: 1 }}
              transition={{ duration: 2.6, ease: "easeInOut" }}
              className="absolute left-1/2 bottom-[22%] -translate-x-1/2 text-center"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="text-[clamp(2rem,9vw,4rem)] leading-none drop-shadow-[0_10px_18px_rgba(0,0,0,0.6)]"
              >
                {avatar || "🧑‍🎓"}
              </motion.div>
              <div className="mx-auto mt-1 h-1.5 w-12 rounded-full bg-black/50 blur-[2px]" />
            </motion.div>

            {/* Celebration sparks */}
            {act >= 1 &&
              Array.from({ length: 14 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute text-lg"
                  style={{ left: `${8 + i * 6.4}%`, bottom: "24%" }}
                  initial={{ y: 0, opacity: 0 }}
                  animate={{ y: -160 - (i % 4) * 40, opacity: [0, 1, 0] }}
                  transition={{ duration: 3.4, repeat: Infinity, delay: i * 0.18 }}
                >
                  {i % 3 === 0 ? "✨" : i % 3 === 1 ? "🎉" : "🎓"}
                </motion.span>
              ))}

            {/* Lumi */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
              className="absolute left-3 bottom-3 right-3 sm:left-4 sm:right-4 rounded-xl border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-sm"
            >
              <div className="flex items-start gap-2">
                <span className="text-xl">🪄</span>
                <div className="min-w-0">
                  <div className="text-[10px] font-orbitron uppercase tracking-[0.3em] text-[var(--rune)]">
                    Lumi
                  </div>
                  <p className="text-xs sm:text-sm leading-snug">
                    {act === 0 && `The Academy gathers, ${studentName}. Walk forward.`}
                    {act === 1 && `Every Quest in ${subject} is complete. The Academy remembers.`}
                    {act >= 2 &&
                      (title
                        ? `Rise, ${title}. Your certificate is sealed in your Legacy.`
                        : `Your certificate is sealed in your Academy Legacy.`)}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Announcement */}
          <div className="p-4 text-center">
            <div className="text-[10px] font-orbitron uppercase tracking-[0.4em] text-amber-300">
              <Sparkles className="inline h-3 w-3 mr-1" /> Graduation
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-extrabold">{subject}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {studentName} has graduated from this Academy building.
            </p>
            <button
              onClick={onClose}
              className="mt-3 rune-border holo-card px-5 py-2 text-sm font-bold hover:monarch-glow transition"
            >
              {act >= 2 ? "View my Legacy" : "Skip ceremony"}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
