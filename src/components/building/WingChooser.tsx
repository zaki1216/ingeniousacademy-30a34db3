import { motion } from "framer-motion";
import { ChevronRight, DoorOpen, Lock } from "lucide-react";

export type WingOption = {
  id: string;
  name: string;
  tag: string;
  emoji: string;
  description: string;
  gradient: string;
  glow: string;
  count?: number;
  locked?: boolean;
  onEnter: () => void;
};

export function WingChooser({
  title,
  subtitle,
  wings,
  onExit,
}: {
  title: string;
  subtitle: string;
  wings: WingOption[];
  onExit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0a0604]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 20%, #3d2a1a 0%, #1a1108 55%, #050301 100%)",
        }}
      />
      {/* Ambient dust */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-amber-200/60"
            style={{
              left: `${(i * 41) % 100}%`,
              top: `${(i * 27) % 100}%`,
              boxShadow: "0 0 6px rgba(251,191,36,0.6)",
            }}
            animate={{ y: [0, -40, 0], opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: 6 + (i % 5), repeat: Infinity, delay: (i % 8) * 0.4 }}
          />
        ))}
      </div>

      <div className="relative min-h-screen flex flex-col p-4 sm:p-6 md:p-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onExit}
            className="flex items-center gap-2 rounded-full pl-2 pr-3 sm:pr-4 py-1.5 border border-amber-400/30 bg-black/60 backdrop-blur-md text-amber-100 hover:border-amber-400/70 transition-colors"
          >
            <span className="h-6 w-6 sm:h-7 sm:w-7 rounded-full grid place-items-center bg-amber-500/20 border border-amber-400/40">
              <DoorOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase font-serif">
              Courtyard
            </span>
          </motion.button>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mt-6 sm:mt-10 max-w-2xl mx-auto"
        >
          <div className="text-[10px] sm:text-xs uppercase tracking-[0.4em] text-amber-300 font-bold">
            Choose Your Wing
          </div>
          <h1
            className="mt-2 font-serif text-2xl sm:text-4xl md:text-5xl font-black text-amber-50"
            style={{
              textShadow: "0 4px 30px rgba(251,191,36,0.45)",
              fontFamily: "'Cinzel', serif",
            }}
          >
            {title}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-amber-100/70 italic">
            {subtitle}
          </p>
        </motion.div>

        {/* Wing grid */}
        <div className="mt-8 sm:mt-12 max-w-5xl w-full mx-auto grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {wings.map((w, i) => (
            <motion.button
              key={w.id}
              type="button"
              disabled={w.locked}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              whileHover={w.locked ? {} : { scale: 1.03, y: -4 }}
              whileTap={w.locked ? {} : { scale: 0.98 }}
              onClick={w.onEnter}
              className="group relative text-left rounded-3xl overflow-hidden border border-amber-400/25 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: "linear-gradient(160deg, rgba(30,20,10,0.9), rgba(10,6,3,0.95))",
                boxShadow: w.locked
                  ? "0 10px 30px -10px rgba(0,0,0,0.9)"
                  : `0 20px 50px -15px ${w.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`,
              }}
            >
              {/* Hero */}
              <div
                className="relative h-32 sm:h-40 grid place-items-center overflow-hidden"
                style={{ background: w.gradient }}
              >
                <div
                  className="absolute inset-0 opacity-30 mix-blend-overlay"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5), transparent 50%)",
                  }}
                />
                <div
                  className="text-6xl sm:text-7xl relative"
                  style={{ filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.6))" }}
                >
                  {w.emoji}
                </div>
                {w.locked && (
                  <div className="absolute inset-0 bg-black/60 grid place-items-center">
                    <Lock className="h-8 w-8 text-white/80" />
                  </div>
                )}
              </div>
              {/* Body */}
              <div className="p-4 sm:p-5">
                <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] font-bold text-amber-300/80">
                  {w.tag}
                </div>
                <div
                  className="font-serif text-lg sm:text-xl font-black text-amber-50 mt-0.5"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  {w.name}
                </div>
                <p className="text-xs text-amber-100/70 mt-1.5 line-clamp-2">
                  {w.description}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-amber-200/60 font-bold">
                    {w.count != null ? `${w.count} Dungeons` : ""}
                  </span>
                  {!w.locked && (
                    <span className="inline-flex items-center gap-1 text-amber-300 font-bold text-[10px] uppercase tracking-wider group-hover:text-amber-100 transition-colors">
                      Enter <ChevronRight className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>
              {!w.locked && (
                <motion.div
                  className="absolute inset-0 pointer-events-none rounded-3xl"
                  animate={{ opacity: [0.15, 0.35, 0.15] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  style={{ boxShadow: `inset 0 0 40px ${w.glow}` }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
