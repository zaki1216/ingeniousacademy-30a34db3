import { memo } from "react";
import { motion } from "framer-motion";
import { Check, Coins, Lock, Star } from "lucide-react";

import { RARITY_STYLE, type MarketplaceItemState, type Rarity } from "@/lib/marketplace/config";
import { cn } from "@/lib/utils";

/**
 * A single Marketplace item. Four visually distinct states:
 * 🔒 locked (can't afford / unreleased) · 💰 affordable · ✅ owned · ⭐ equipped
 */
export const MarketplaceItemCard = memo(function MarketplaceItemCard({
  item,
  busy,
  onBuy,
  onEquip,
}: {
  item: MarketplaceItemState;
  busy: boolean;
  onBuy: (item: MarketplaceItemState) => void;
  onEquip: (item: MarketplaceItemState) => void;
}) {
  const rarity = RARITY_STYLE[item.rarity as Rarity] ?? RARITY_STYLE.common;
  const locked = !item.owned && (!item.affordable || item.upcoming);
  const preview = item.icon || item.value;
  const isVisualValue = item.value.includes("gradient") || item.value.startsWith("#");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rune-border holo-card relative overflow-hidden p-3 flex flex-col gap-2",
        item.equipped && "monarch-glow",
        locked && "opacity-70",
      )}
      style={{ boxShadow: item.equipped ? `0 0 0 1px ${rarity.ring}` : undefined }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-[9px] font-orbitron uppercase tracking-[0.2em] font-bold"
          style={{ color: rarity.text }}
        >
          {rarity.label}
        </span>
        {item.equipped ? (
          <span className="text-[9px] font-bold text-amber-300 flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-300" /> Equipped
          </span>
        ) : item.owned ? (
          <span className="text-[9px] font-bold text-emerald-300 flex items-center gap-1">
            <Check className="h-3 w-3" /> Owned
          </span>
        ) : locked ? (
          <span className="text-[9px] font-bold text-muted-foreground flex items-center gap-1">
            <Lock className="h-3 w-3" /> {item.upcoming ? "Soon" : "Locked"}
          </span>
        ) : null}
      </div>

      <div
        className="h-16 rounded-xl grid place-items-center text-3xl border border-white/10"
        style={{
          background: isVisualValue ? item.value : "rgba(255,255,255,0.04)",
        }}
      >
        {isVisualValue ? <span className="text-2xl">{preview}</span> : <span>{preview}</span>}
      </div>

      <div className="min-w-0">
        <div className="text-xs font-extrabold leading-tight truncate">{item.name}</div>
        {item.description && (
          <div className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
            {item.description}
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="text-[11px] font-orbitron font-bold text-amber-300 flex items-center gap-1">
          <Coins className="h-3 w-3" /> {item.price_coins.toLocaleString()}
        </span>
        {item.owned ? (
          <button
            type="button"
            disabled={item.equipped || busy}
            onClick={() => onEquip(item)}
            className="rune-border px-2.5 py-1.5 text-[11px] font-bold rounded-lg disabled:opacity-50 hover:monarch-glow transition-all"
          >
            {item.equipped ? "Equipped" : "Equip"}
          </button>
        ) : (
          <button
            type="button"
            disabled={locked || busy}
            onClick={() => onBuy(item)}
            className="px-2.5 py-1.5 text-[11px] font-black rounded-lg text-white disabled:opacity-50 transition-all"
            style={{ background: "var(--gradient-monarch)" }}
          >
            {item.upcoming ? "Coming soon" : "Buy"}
          </button>
        )}
      </div>
    </motion.div>
  );
});
