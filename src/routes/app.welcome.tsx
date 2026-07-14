import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoAsset from "@/assets/ingenious-logo.webp.asset.json";

export const Route = createFileRoute("/app/welcome")({
  component: WelcomeIntro,
});

const LINES = [
  "Welcome to Ingenious Academy",
  "Every Lecture is a Quest",
  "Every Chapter is a Dungeon",
  "Every Test is a Boss Battle",
  "Your adventure begins now.",
];

function WelcomeIntro() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= LINES.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), 1800);
    return () => clearTimeout(t);
  }, [step]);

  function enterCampus() {
    try {
      sessionStorage.setItem("campusIntroSeen", "1");
    } catch {
      // ignore
    }
    navigate({ to: "/app" });
  }

  function skip() {
    setStep(LINES.length);
  }

  const done = step >= LINES.length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#050416] text-white">
      {/* Magical layered background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 20% 15%, rgba(99,102,241,0.35), transparent 55%), radial-gradient(circle at 85% 80%, rgba(217,70,239,0.28), transparent 55%), radial-gradient(circle at 50% 50%, rgba(59,130,246,0.18), transparent 65%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-40 mix-blend-screen"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.6) 100%)",
          }}
        />
        {/* Drifting particles */}
        {Array.from({ length: 40 }).map((_, i) => {
          const left = (i * 97) % 100;
          const size = 2 + ((i * 13) % 4);
          const delay = (i * 0.37) % 6;
          const dur = 6 + ((i * 7) % 8);
          return (
            <motion.span
              key={i}
              className="absolute rounded-full bg-white/70"
              style={{
                left: `${left}%`,
                width: size,
                height: size,
                boxShadow: "0 0 8px rgba(255,255,255,0.9)",
              }}
              initial={{ y: "110vh", opacity: 0 }}
              animate={{ y: "-10vh", opacity: [0, 1, 1, 0] }}
              transition={{
                duration: dur,
                delay,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          );
        })}
      </div>

      {/* Skip button */}
      {!done && (
        <button
          onClick={skip}
          className="absolute top-5 right-5 text-xs uppercase tracking-widest text-white/60 hover:text-white transition-colors z-10"
        >
          Skip intro →
        </button>
      )}

      <div className="relative h-full w-full flex flex-col items-center justify-center px-6 text-center">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0, filter: "blur(12px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="mb-10"
        >
          <div
            className="h-28 w-28 md:h-36 md:w-36 rounded-3xl bg-white/95 grid place-items-center overflow-hidden"
            style={{
              boxShadow:
                "0 0 60px rgba(139,92,246,0.65), 0 0 120px rgba(59,130,246,0.35)",
            }}
          >
            <img
              src={logoAsset.url}
              alt="Ingenious Academy"
              className="h-24 w-24 md:h-32 md:w-32 object-contain"
            />
          </div>
        </motion.div>

        {/* Sequenced lines */}
        <div className="h-24 md:h-28 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {!done && (
              <motion.h1
                key={step}
                initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -16, filter: "blur(8px)" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-2xl md:text-5xl font-black tracking-tight"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg,#fef3c7,#fbbf24,#f0abfc,#a5b4fc)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  textShadow: "0 0 40px rgba(251,191,36,0.15)",
                }}
              >
                {LINES[step]}
              </motion.h1>
            )}
            {done && (
              <motion.div
                key="cta"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-center gap-6"
              >
                <p className="text-sm md:text-base uppercase tracking-[0.4em] text-white/70">
                  Your adventure awaits
                </p>
                <motion.button
                  onClick={enterCampus}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative px-10 md:px-14 py-4 md:py-5 rounded-2xl font-orbitron font-black tracking-[0.25em] text-base md:text-lg text-white overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(135deg,#7c3aed,#3b82f6 55%,#22d3ee)",
                    boxShadow:
                      "0 0 40px rgba(124,58,237,0.7), 0 0 80px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.35)",
                  }}
                >
                  <span className="relative z-10">ENTER CAMPUS</span>
                  <motion.span
                    className="absolute inset-0 bg-white/25"
                    initial={{ x: "-120%" }}
                    animate={{ x: "120%" }}
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    style={{ mixBlendMode: "overlay" }}
                  />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
