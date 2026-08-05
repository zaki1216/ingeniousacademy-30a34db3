import { motion } from "framer-motion";
import { Check, Lock } from "lucide-react";

import { RARITY_STYLE, type Rarity } from "@/lib/hero/catalog";
import type { LegacyTitle } from "@/lib/legacy/config";
import { cn } from "@/lib/utils";

/**
 * Academy Titles — cosmetic recognition only. One title can be worn beneath
 * the student's username; titles never affect progression or access.
 */
export function TitleGallery({
  titles,
  onEquip,
  busy,
}: {
  titles: LegacyTitle[];
  onEquip: (code: string | null) => void;
  busy?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
      {titles.map((t, i) => {
        const style = RARITY_STYLE[(t.rarity as Rarity) ?? "common"] ?? RARITY_STYLE.common;
        return (
          <motion.div
            key={t.code}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.4) }}
            className={cn(
              "rune-border holo-card p-3 flex items-start gap-3",
              !t.unlocked && "opacity-70",
            )}
            style={t.equipped ? { boxShadow: `0 0 22px -8px ${style.color}` } : undefined}
          >
            <div
              className="h-11 w-11 shrink-0 rounded-xl grid place-items-center text-xl"
              style={{ background: t.unlocked ? style.gradient : "rgba(255,255,255,0.05)" }}
            >
              {t.unlocked ? t.icon : <Lock className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold truncate">{t.name}</span>
                <span
                  className="text-[9px] font-orbitron uppercase tracking-widest"
                  style={{ color: style.color }}
                >
                  {style.label}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground leading-snug">
                {t.description ?? (t.requirement ? `Requires ${t.requirement}` : "")}
              </div>
              <div className="mt-2">
                {t.unlocked ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onEquip(t.equipped ? null : t.code)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-[11px] font-bold border transition",
                      t.equipped
                        ? "border-amber-300/50 bg-amber-300/15 text-amber-200"
                        : "border-white/15 bg-white/5 hover:bg-white/10",
                    )}
                  >
                    {t.equipped ? (
                      <span className="flex items-center gap-1">
                        <Check className="h-3 w-3" /> Equipped
                      </span>
                    ) : (
                      "Wear this title"
                    )}
                  </button>
                ) : (
                  <span className="text-[10px] font-orbitron uppercase tracking-widest text-muted-foreground">
                    {t.requirement ? `Locked · ${t.requirement}` : "Locked"}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
