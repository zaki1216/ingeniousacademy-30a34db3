import { AnimatePresence, motion } from "framer-motion";

/** Satisfying purchase celebration — coins burst + item flourish. */
export function PurchaseCelebration({
  item,
  onDone,
}: {
  item: { name: string; icon: string | null; value: string } | null;
  onDone: () => void;
}) {
  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/70 backdrop-blur-sm px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDone}
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-xl"
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
              animate={{
                opacity: [0, 1, 0],
                x: Math.cos((i / 18) * Math.PI * 2) * 180,
                y: Math.sin((i / 18) * Math.PI * 2) * 180,
                scale: 1,
              }}
              transition={{ duration: 1.2, delay: i * 0.02 }}
            >
              {i % 2 ? "✨" : "🪙"}
            </motion.span>
          ))}

          <motion.div
            className="rune-border holo-card monarch-glow relative p-6 text-center max-w-xs w-full"
            initial={{ scale: 0.7, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
          >
            <div className="text-5xl">{item.icon || item.value}</div>
            <div className="mt-3 text-[10px] font-orbitron uppercase tracking-[0.3em] text-[var(--rune)]">
              Purchased
            </div>
            <div className="text-lg font-extrabold">{item.name}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Equipped and live on your Hero Profile.
            </div>
            <button
              type="button"
              onClick={onDone}
              className="mt-4 w-full px-3 py-2 rounded-xl text-sm font-black text-white"
              style={{ background: "var(--gradient-monarch)" }}
            >
              Wonderful
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
