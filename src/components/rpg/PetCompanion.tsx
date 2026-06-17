import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getEquippedPetId, getPet, type Pet } from "@/lib/rpg/pets";
import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg";
const SIZES: Record<Size, { box: string; emoji: string }> = {
  xs: { box: "h-5 w-5", emoji: "text-[12px]" },
  sm: { box: "h-7 w-7", emoji: "text-[16px]" },
  md: { box: "h-9 w-9", emoji: "text-[22px]" },
  lg: { box: "h-14 w-14", emoji: "text-[34px]" },
};

function useEquippedPet(): Pet | null {
  const [pet, setPet] = useState<Pet | null>(() => getPet(getEquippedPetId()));
  useEffect(() => {
    const sync = () => setPet(getPet(getEquippedPetId()));
    window.addEventListener("pet:changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("pet:changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return pet;
}

export function PetCompanion({
  size = "sm",
  className,
  pet: overridePet,
  showRing = true,
}: {
  size?: Size;
  className?: string;
  pet?: Pet | null;
  showRing?: boolean;
}) {
  const equipped = useEquippedPet();
  const pet = overridePet ?? equipped;
  if (!pet) return null;
  const sz = SIZES[size];

  return (
    <motion.div
      className={cn("relative shrink-0", className)}
      initial={{ scale: 0, rotate: -20, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 18 }}
      title={`${pet.name} — ${pet.description}`}
    >
      <motion.div
        className={cn(
          "rounded-full p-[2px] grid place-items-center",
          sz.box,
          showRing && "ring-1 ring-white/15",
        )}
        style={{
          background: pet.gradient,
          boxShadow: `0 0 12px ${pet.glow}`,
        }}
        animate={{ y: [0, -2, 0, 1, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="h-full w-full rounded-full bg-[var(--bg-void)]/85 grid place-items-center">
          <span className={cn("leading-none", sz.emoji)}>{pet.emoji}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
