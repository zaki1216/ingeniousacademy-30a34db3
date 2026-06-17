import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Lock, Check } from "lucide-react";
import { toast } from "sonner";

import {
  PETS,
  getEquippedPetId,
  setEquippedPetId,
  getOwnedPetIds,
  unlockPet,
  rarityColor,
  type Pet,
} from "@/lib/rpg/pets";
import { PetCompanion } from "@/components/rpg/PetCompanion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/pets")({
  component: PetsPage,
});

const FILTERS = ["All", "Universal", "Math", "Science", "Language", "Reasoning"] as const;

function PetsPage() {
  const [equipped, setEquipped] = useState<string | null>(null);
  const [owned, setOwned] = useState<string[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  useEffect(() => {
    setEquipped(getEquippedPetId());
    setOwned(getOwnedPetIds());
    const sync = () => {
      setEquipped(getEquippedPetId());
      setOwned(getOwnedPetIds());
    };
    window.addEventListener("pet:changed", sync);
    return () => window.removeEventListener("pet:changed", sync);
  }, []);

  const list = PETS.filter((p) => filter === "All" || p.subject === filter);
  const ownedCount = owned.length;

  function handleEquip(p: Pet) {
    if (!owned.includes(p.id)) return;
    if (equipped === p.id) {
      setEquippedPetId(null);
      toast.success(`${p.name} dismissed`);
    } else {
      setEquippedPetId(p.id);
      toast.success(`${p.name} now follows you`);
    }
  }

  function handleSummon(p: Pet) {
    unlockPet(p.id);
    setEquippedPetId(p.id);
    toast.success(`✨ ${p.name} summoned!`);
  }

  return (
    <div className="space-y-5">
      <header className="rune-border holo-card p-5">
        <div className="flex items-center gap-4">
          <div className="grid place-items-center h-16 w-16 rounded-2xl bg-[image:var(--gradient-primary)] glow-primary">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-orbitron font-bold tracking-[0.2em] text-[var(--rune)]">
              MENAGERIE
            </div>
            <h1 className="text-2xl font-extrabold">Pet Companions</h1>
            <p className="text-sm text-muted-foreground">
              Collectible familiars that walk beside your hero.{" "}
              <span className="text-foreground/80">
                {ownedCount}/{PETS.length} discovered
              </span>{" "}
              · cosmetic only.
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-orbitron font-bold tracking-wider transition-all",
              filter === f
                ? "bg-[image:var(--gradient-primary)] text-white shadow-[var(--shadow-glow)]"
                : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground",
            )}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((p) => {
          const isOwned = owned.includes(p.id);
          const isEquipped = equipped === p.id;
          const rcolor = rarityColor(p.rarity);
          return (
            <motion.div
              key={p.id}
              layout
              className={cn(
                "relative rounded-2xl border overflow-hidden p-4 holo-card",
                isEquipped ? "border-[var(--rune)]/60" : "border-white/10",
              )}
              style={{
                boxShadow: isEquipped
                  ? `0 0 24px color-mix(in oklab, ${rcolor} 35%, transparent)`
                  : undefined,
              }}
            >
              <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 0%, ${p.glow}, transparent 60%)`,
                }}
              />

              <div className="relative flex items-start gap-3">
                <div className={cn("transition-all", !isOwned && "grayscale opacity-50")}>
                  <PetCompanion pet={p} size="lg" showRing={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-base truncate">{p.name}</h3>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-orbitron font-black tracking-widest"
                      style={{
                        color: rcolor,
                        background: `color-mix(in oklab, ${rcolor} 18%, transparent)`,
                        border: `1px solid color-mix(in oklab, ${rcolor} 40%, transparent)`,
                      }}
                    >
                      {p.rarity.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[10px] font-orbitron tracking-wider text-muted-foreground mt-0.5">
                    {p.subject.toUpperCase()} FAMILIAR
                  </div>
                  <p className="text-sm text-foreground/85 mt-1">{p.description}</p>
                  <p className="text-xs italic text-muted-foreground mt-0.5">"{p.flavor}"</p>
                </div>
              </div>

              <div className="relative mt-4 flex items-center justify-between gap-2">
                {isOwned ? (
                  <>
                    <span className="text-[10px] font-orbitron font-bold tracking-wider text-emerald-400 flex items-center gap-1">
                      <Check className="h-3 w-3" /> UNLOCKED
                    </span>
                    <Button
                      size="sm"
                      variant={isEquipped ? "outline" : "default"}
                      onClick={() => handleEquip(p)}
                    >
                      {isEquipped ? "Dismiss" : "Equip"}
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" /> {p.unlockHint}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => handleSummon(p)}>
                      Summon
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Pets are purely cosmetic for now — no stat bonuses. More familiars and abilities coming
        soon.
      </p>
    </div>
  );
}
