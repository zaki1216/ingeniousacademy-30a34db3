import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Coins, Store } from "lucide-react";
import { toast } from "sonner";

import { MarketplaceItemCard } from "./MarketplaceItemCard";
import { PurchaseCelebration } from "./PurchaseCelebration";
import { SHOPS, type MarketplaceItemState, type ShopDef } from "@/lib/marketplace/config";
import { useMarketplace, useMarketplaceActions } from "@/lib/marketplace/useMarketplace";
import { cn } from "@/lib/utils";

/**
 * The Academy Marketplace street. Shops are configuration-driven
 * (`src/lib/marketplace/config.ts`) so new stalls need no UI changes.
 */
export function MarketplaceStreet() {
  const { data, isLoading } = useMarketplace();
  const { buy, equip } = useMarketplaceActions();
  const [openShop, setOpenShop] = useState<ShopDef | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [celebrating, setCelebrating] = useState<MarketplaceItemState | null>(null);

  const itemsByShop = useMemo(() => {
    const map = new Map<string, MarketplaceItemState[]>();
    for (const it of data?.items ?? []) {
      const list = map.get(it.shop_code) ?? [];
      list.push(it);
      map.set(it.shop_code, list);
    }
    return map;
  }, [data?.items]);

  const busy = buy.isPending || equip.isPending;

  const handleBuy = async (item: MarketplaceItemState) => {
    try {
      await buy.mutateAsync({ itemId: item.id, equip: true });
      setCelebrating(item);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Purchase failed");
    }
  };

  const handleEquip = async (item: MarketplaceItemState) => {
    try {
      await equip.mutateAsync(item.id);
      toast.success(`${item.name} equipped`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not equip");
    }
  };

  const shopItems = openShop ? (itemsByShop.get(openShop.code) ?? []) : [];
  const visibleItems =
    typeFilter === "all" ? shopItems : shopItems.filter((i) => i.type === typeFilter);

  return (
    <div className="relative space-y-5">
      {/* Coin purse */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="h-11 w-11 rounded-2xl grid place-items-center"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklab, #f59e0b 40%, transparent), color-mix(in oklab, var(--monarch) 25%, transparent))",
            }}
          >
            <Store className="h-5 w-5 text-white/90" />
          </div>
          <div>
            <div className="text-[10px] font-orbitron uppercase tracking-[0.28em] text-[var(--rune)]">
              Academy Street
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">Marketplace</h1>
          </div>
        </div>
        <div className="rune-border holo-card px-3 py-2 text-sm font-orbitron font-black text-amber-300 flex items-center gap-2">
          <Coins className="h-4 w-4" /> {(data?.coins ?? 0).toLocaleString()}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!openShop ? (
          <motion.div
            key="street"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <StreetBackdrop />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {SHOPS.map((shop) => {
                const count = itemsByShop.get(shop.code)?.length ?? 0;
                const owned = (itemsByShop.get(shop.code) ?? []).filter((i) => i.owned).length;
                const disabled = shop.comingSoon || (!isLoading && count === 0);
                return (
                  <motion.button
                    key={shop.code}
                    type="button"
                    whileHover={disabled ? undefined : { y: -4 }}
                    whileTap={disabled ? undefined : { scale: 0.98 }}
                    disabled={disabled}
                    onClick={() => {
                      setTypeFilter("all");
                      setOpenShop(shop);
                    }}
                    className={cn(
                      "rune-border holo-card p-4 text-left relative overflow-hidden transition-all",
                      disabled ? "opacity-60" : "hover:monarch-glow",
                    )}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-30"
                      style={{
                        background: `radial-gradient(circle at 100% 0%, ${shop.accent}55, transparent 60%)`,
                      }}
                    />
                    <div className="relative flex items-start gap-3">
                      <div className="h-12 w-12 rounded-xl grid place-items-center text-2xl bg-white/5 border border-white/10">
                        {shop.emoji}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold leading-tight">{shop.name}</div>
                        <div className="text-[11px] text-muted-foreground leading-snug">
                          {shop.tagline}
                        </div>
                        <div className="mt-2 text-[10px] font-orbitron tracking-wider text-muted-foreground">
                          {shop.comingSoon
                            ? "Opening soon"
                            : `${owned}/${count} collected`}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={openShop.code}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setOpenShop(null)}
                className="rune-border holo-card px-3 py-2 text-xs font-bold flex items-center gap-2 hover:monarch-glow transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Street
              </button>
              <div className="text-sm font-extrabold flex items-center gap-2">
                <span className="text-xl">{openShop.emoji}</span> {openShop.name}
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {[{ code: "all", label: "All" }, ...openShop.types].map((t) => (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => setTypeFilter(t.code)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold border transition-all",
                    typeFilter === t.code
                      ? "border-transparent text-white"
                      : "border-white/10 text-muted-foreground hover:text-foreground",
                  )}
                  style={
                    typeFilter === t.code ? { background: "var(--gradient-monarch)" } : undefined
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>

            {visibleItems.length === 0 ? (
              <div className="rune-border holo-card p-6 text-center text-sm text-muted-foreground">
                Nothing on these shelves yet — check back soon.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {visibleItems.map((item) => (
                  <MarketplaceItemCard
                    key={item.id}
                    item={item}
                    busy={busy}
                    onBuy={handleBuy}
                    onEquip={handleEquip}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <PurchaseCelebration item={celebrating} onDone={() => setCelebrating(null)} />
    </div>
  );
}

function StreetBackdrop() {
  return (
    <div className="rune-border holo-card relative overflow-hidden p-5">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at 10% 0%, color-mix(in oklab, #f59e0b 25%, transparent), transparent 55%), radial-gradient(ellipse at 100% 120%, color-mix(in oklab, var(--monarch) 35%, transparent), transparent 60%)",
        }}
      />
      <div className="relative flex items-center gap-3">
        <div className="text-3xl">🏪</div>
        <div>
          <div className="text-sm font-extrabold">Welcome to Academy Street</div>
          <div className="text-xs text-muted-foreground">
            Spend the Coins you earned on Quests, Missions and Master Trials. Every purchase is
            cosmetic — never an academic advantage.
          </div>
        </div>
      </div>
      <div className="relative mt-4 flex gap-2 overflow-x-auto pb-1">
        {["🏮", "🌿", "🪧", "🧺", "🏮", "🌿", "🪧"].map((e, i) => (
          <motion.span
            key={i}
            className="text-lg"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3 + i * 0.2, repeat: Infinity }}
          >
            {e}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
