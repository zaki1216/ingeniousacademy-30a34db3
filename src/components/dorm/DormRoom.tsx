import { motion } from "framer-motion";
import { Plus } from "lucide-react";

import { DORM_SLOTS, type DormDecoration, type DormLayout } from "@/lib/dorm/config";
import { cn } from "@/lib/utils";

/**
 * The dorm room canvas — cosy Academy quarters with fixed placement slots.
 * Version 1 deliberately uses predefined hotspots (no free dragging) so
 * layouts stay consistent across phones, tablets and desktops.
 */
export function DormRoom({
  layout,
  itemsById,
  avatar,
  onEdit,
}: {
  layout: DormLayout;
  itemsById: Map<string, DormDecoration>;
  avatar: string;
  onEdit: (slotId: string) => void;
}) {
  return (
    <div className="rune-border holo-card relative overflow-hidden">
      <div className="relative w-full aspect-[16/11] sm:aspect-[16/9]">
        {/* Walls */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #2b2140 0%, #34264c 55%, #3a2a52 62%, #2a1d3a 100%)",
          }}
        />
        {/* Warm light pool */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 70% 20%, rgba(251,191,36,0.22), transparent 55%), radial-gradient(ellipse at 20% 90%, rgba(167,139,250,0.18), transparent 60%)",
          }}
        />
        {/* Floor */}
        <div
          className="absolute inset-x-0 bottom-0 h-[34%]"
          style={{
            background: "linear-gradient(180deg, #6b4a2f 0%, #4a3220 100%)",
            boxShadow: "inset 0 6px 18px rgba(0,0,0,0.45)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-[34%] opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(0,0,0,0.35) 0 2px, transparent 2px 42px)",
          }}
        />

        {/* Placement slots */}
        {DORM_SLOTS.map((slot) => {
          const itemId = layout[slot.id] ?? null;
          const item = itemId ? itemsById.get(itemId) : undefined;
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => onEdit(slot.id)}
              aria-label={`${slot.label}${item ? `: ${item.name}` : " — empty"}`}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center rounded-2xl transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
                item
                  ? "hover:scale-110"
                  : "border border-dashed border-white/25 bg-white/5 hover:bg-white/10",
              )}
              style={{
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                width: `${slot.size}%`,
                aspectRatio: "1 / 1",
              }}
            >
              {item ? (
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-[clamp(1.1rem,4.5vw,2.6rem)] leading-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
                >
                  {item.value || item.icon || slot.placeholder}
                </motion.span>
              ) : (
                <Plus className="h-3.5 w-3.5 text-white/50" />
              )}
            </button>
          );
        })}

        {/* The student, standing in their own room */}
        <div className="absolute left-[58%] bottom-[8%] -translate-x-1/2 text-center pointer-events-none">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
            className="text-[clamp(1.6rem,7vw,3.4rem)] leading-none drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
          >
            {avatar}
          </motion.div>
          <div className="mx-auto mt-1 h-1.5 w-10 rounded-full bg-black/40 blur-[2px]" />
        </div>
      </div>
    </div>
  );
}
