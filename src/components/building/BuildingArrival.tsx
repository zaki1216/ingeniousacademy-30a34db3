/**
 * BuildingArrival — brief cinematic overlay played when the cadet steps
 * into an academic building. Reads its copy entirely from the building's
 * render config (icon, title, subtitle, mentor, welcome line) so it works
 * for every building the Generic Building Engine renders. No page routing
 * or data-fetching happens here — the overlay simply fades out after a
 * short window so the underlying interior can take over.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import type { BuildingCurriculum } from "@/lib/curriculum/types";

export function BuildingArrival({
  building,
  visible,
}: {
  building: BuildingCurriculum;
  visible: boolean;
}) {
  const reduced = useReducedMotion();
  const render = building.render;
  const theme = render?.theme;
  const icon = render?.icon ?? "🏛️";
  const mentor = render?.mentor;
  const welcome =
    render?.welcome ??
    (mentor?.welcome ? mentor.welcome("Cadet") : undefined);

  const fadeDur = reduced ? 0.15 : 0.5;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="building-arrival"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: fadeDur, ease: "easeOut" }}
          className="fixed inset-0 z-[60] grid place-items-center pointer-events-none"
          style={{
            background: theme?.background ?? "radial-gradient(ellipse at 50% 30%, #1a1108 0%, #05030a 100%)",
          }}
          aria-hidden
        >
          {/* Soft particle wash — mirrors the interior aesthetic. */}
          {!reduced && theme && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {Array.from({ length: 14 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute h-1 w-1 rounded-full"
                  style={{
                    left: `${(i * 53) % 100}%`,
                    top: `${(i * 31) % 100}%`,
                    background: theme.particle,
                    boxShadow: theme.particleShadow,
                  }}
                  animate={{ y: [0, -30, 0], opacity: [0.15, 0.7, 0.15] }}
                  transition={{ duration: 5 + (i % 4), repeat: Infinity, delay: (i % 6) * 0.3 }}
                />
              ))}
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: reduced ? 0 : 16, scale: reduced ? 1 : 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: reduced ? 1 : 0.98 }}
            transition={{ duration: reduced ? 0.15 : 0.6, ease: "easeOut" }}
            className="relative text-center px-6 max-w-lg"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: reduced ? 0 : 0.05, duration: reduced ? 0.15 : 0.45, ease: "backOut" }}
              className="text-6xl sm:text-7xl mb-4"
              style={{ filter: `drop-shadow(0 6px 20px ${theme?.particle ?? "rgba(255,255,255,0.4)"})` }}
            >
              {icon}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: reduced ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduced ? 0 : 0.15, duration: 0.35 }}
              className="text-[10px] sm:text-xs uppercase tracking-[0.4em] font-bold"
              style={{ color: theme?.primary ?? "#fbbf24" }}
            >
              {render?.tagLabel ?? "Academy"}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: reduced ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduced ? 0 : 0.22, duration: 0.4 }}
              className="mt-2 font-serif text-2xl sm:text-4xl font-black text-white"
              style={{
                fontFamily: "'Cinzel', serif",
                textShadow: `0 4px 30px ${theme?.particle ?? "rgba(255,255,255,0.35)"}`,
              }}
            >
              {render?.infoTitle ?? building.title}
            </motion.h1>
            {building.subtitle && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduced ? 0 : 0.32, duration: 0.4 }}
                className="mt-2 text-xs sm:text-sm italic"
                style={{ color: `${theme?.primary ?? "#fbbf24"}cc` }}
              >
                {render?.infoSubtitle ?? building.subtitle}
              </motion.p>
            )}
            {(mentor || welcome) && (
              <motion.div
                initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduced ? 0 : 0.42, duration: 0.4 }}
                className="mt-5 inline-block rounded-2xl border px-4 py-2.5 backdrop-blur-md"
                style={{
                  borderColor: `${theme?.primary ?? "#fbbf24"}55`,
                  background: "rgba(0,0,0,0.45)",
                }}
              >
                {mentor && (
                  <div
                    className="text-[10px] uppercase tracking-[0.3em] font-bold"
                    style={{ color: theme?.primary ?? "#fbbf24" }}
                  >
                    {mentor.title} {mentor.name}
                  </div>
                )}
                {welcome && (
                  <div className="text-sm text-white/90 mt-1 italic font-serif">
                    &ldquo;{welcome}&rdquo;
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
