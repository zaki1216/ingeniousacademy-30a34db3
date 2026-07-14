import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Coins, Check, Lock, Sparkles, Ticket, Gift, ChevronRight, Store,
  Scroll, Shirt, Crown, Package, Flame, Clock, Star, ArrowRight, Backpack,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getShop, purchaseShopItem, equipShopItem } from "@/lib/api/shop.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/shop")({
  head: () => ({
    meta: [
      { title: "Merchant's Emporium — Ingenious Academy" },
      { name: "description", content: "Exchange your Academy Coins for passes, cosmetics, titles and treasure chests at the Merchant's Emporium." },
    ],
  }),
  component: EmporiumPage,
});

const RARITY: Record<string, { label: string; ring: string; chip: string; glow: string }> = {
  common:    { label: "Common",    ring: "ring-slate-400/40",  chip: "bg-slate-700 text-slate-100",       glow: "" },
  rare:      { label: "Rare",      ring: "ring-sky-400/60",    chip: "bg-sky-600 text-sky-50",            glow: "shadow-[0_0_18px_rgba(56,189,248,0.25)]" },
  epic:      { label: "Epic",      ring: "ring-fuchsia-400/70",chip: "bg-fuchsia-600 text-white",         glow: "shadow-[0_0_22px_rgba(217,70,239,0.35)]" },
  legendary: { label: "Legendary", ring: "ring-amber-300/80",  chip: "bg-amber-400 text-amber-950",       glow: "shadow-[0_0_28px_rgba(251,191,36,0.45)]" },
};

type ShopType = "avatar" | "frame" | "title" | "theme" | "name_color" | "badge" | "seasonal" | "shadow_skin" | "pet_skin" | "effect";

type ShopItem = {
  id: string;
  type: ShopType;
  code: string;
  name: string;
  value: string;
  price_coins: number;
  rarity: keyof typeof RARITY;
  owned: boolean;
};

const EQUIPPABLE: ShopType[] = ["avatar", "frame", "title"];

type ShelfKey = "cosmetics" | "titles" | "seasonal" | "effects";
const SHELVES: { key: ShelfKey; label: string; icon: React.ReactNode; caption: string; types: ShopType[] }[] = [
  { key: "cosmetics", label: "Cosmetics Shelf", icon: <Shirt className="h-5 w-5" />, caption: "Avatars, frames, themes & name colours", types: ["avatar", "frame", "theme", "name_color"] },
  { key: "titles",    label: "Titles Desk",     icon: <Crown className="h-5 w-5" />, caption: "Wear a name earned through deeds",       types: ["title"] },
  { key: "seasonal",  label: "Seasonal Items",  icon: <Star className="h-5 w-5" />,  caption: "Limited banners, badges & event gear",   types: ["seasonal", "badge"] },
  { key: "effects",   label: "Arcane Effects",  icon: <Sparkles className="h-5 w-5" />, caption: "Shadow skins, pet skins & auras",     types: ["shadow_skin", "pet_skin", "effect"] },
];

function EmporiumPage() {
  const qc = useQueryClient();
  const getShopFn = useServerFn(getShop);
  const buyFn = useServerFn(purchaseShopItem);
  const equipFn = useServerFn(equipShopItem);

  const shop = useQuery({ queryKey: ["shop"], queryFn: () => getShopFn() });
  const [pending, setPending] = useState<string | null>(null);
  const [acquired, setAcquired] = useState<ShopItem | null>(null);
  const [openShelf, setOpenShelf] = useState<ShelfKey>("cosmetics");

  const items = (shop.data?.items ?? []) as ShopItem[];
  const coins = shop.data?.coins ?? 0;
  const equipped = shop.data?.equipped;

  const dailyDeal = useMemo(() => pickDailyDeal(items), [items]);
  const coinGoal = useMemo(() => pickCoinGoal(items, coins), [items, coins]);

  function isEquipped(it: ShopItem) {
    if (!equipped) return false;
    if (it.type === "avatar") return equipped.avatar === it.value;
    if (it.type === "frame") return equipped.frame === it.value;
    if (it.type === "title") return equipped.title === it.value;
    return false;
  }

  async function buy(it: ShopItem, discountPct = 0) {
    const price = Math.max(0, Math.round(it.price_coins * (1 - discountPct)));
    if (coins < price) {
      toast.error("Not enough Academy Coins");
      return;
    }
    setPending(it.id);
    try {
      await buyFn({ data: { itemId: it.id } });
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, colors: ["#fbbf24", "#f59e0b", "#facc15", "#fde68a"] });
      setAcquired(it);
      await qc.invalidateQueries({ queryKey: ["shop"] });
      await qc.invalidateQueries({ queryKey: ["gam-dashboard"] });
      setTimeout(() => setAcquired(null), 2400);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  async function equip(it: ShopItem) {
    if (!EQUIPPABLE.includes(it.type)) {
      toast.success(`${it.name} is safe in your Inventory Chest`);
      return;
    }
    setPending(it.id);
    try {
      await equipFn({ data: { itemId: it.id } });
      toast.success(`Equipped ${it.name}`);
      await qc.invalidateQueries({ queryKey: ["shop"] });
      await qc.invalidateQueries({ queryKey: ["profile-cosmetics"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  const activeShelf = SHELVES.find((s) => s.key === openShelf)!;
  const shelfItems = items.filter((i) => activeShelf.types.includes(i.type));

  return (
    <div className="relative pb-8">
      <EmporiumAmbience />

      <div className="relative space-y-6">
        {/* Merchant welcome */}
        <MerchantBanner coins={coins} />

        {/* Counters row: Pass Counter + Treasure Chest Corner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CounterCard
            to="/app/passes"
            icon={<Ticket className="h-6 w-6" />}
            eyebrow="Pass Counter"
            title="Battle & Season Passes"
            caption="Homework Shield, Streak Shield, Retry Tokens & more"
            gradient="linear-gradient(135deg, #7c3aed, #db2777)"
          />
          <CounterCard
            to="/app/spin"
            icon={<Gift className="h-6 w-6" />}
            eyebrow="Treasure Chest Corner"
            title="Daily Fortune Spin"
            caption="Common → Legendary drops from the Merchant's chest"
            gradient="linear-gradient(135deg, #f59e0b, #ef4444)"
          />
        </div>

        {/* Pass showcase preview (illustrated scroll cards) */}
        <PassShowcase />

        {/* Daily Deal + Coin Goal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dailyDeal ? (
            <DailyDealCard
              item={dailyDeal.item}
              discountPct={dailyDeal.discount}
              coins={coins}
              pending={pending === dailyDeal.item.id}
              onBuy={() => buy(dailyDeal.item, dailyDeal.discount)}
            />
          ) : (
            <EmptyDealCard />
          )}
          <CoinGoalCard goal={coinGoal} coins={coins} />
        </div>

        {/* Shelves */}
        <section>
          <SectionHeader eyebrow="Wander the aisles" title="Merchant's Shelves" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {SHELVES.map((s) => {
              const active = s.key === openShelf;
              return (
                <button
                  key={s.key}
                  onClick={() => setOpenShelf(s.key)}
                  className={cn(
                    "rune-border holo-card px-3 py-2.5 text-left transition-all",
                    active ? "monarch-glow" : "opacity-80 hover:opacity-100",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-8 w-8 rounded-lg grid place-items-center"
                      style={{
                        background: active
                          ? "var(--gradient-monarch)"
                          : "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                      }}
                    >
                      {s.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold leading-tight truncate">{s.label}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{s.caption}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {shelfItems.length === 0 ? (
            <div className="rune-border holo-card p-8 text-center text-sm text-muted-foreground">
              The Merchant is restocking this shelf. Return soon.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {shelfItems.map((it) => (
                <ItemCard
                  key={it.id}
                  item={it}
                  equipped={isEquipped(it)}
                  coins={coins}
                  pending={pending === it.id}
                  onBuy={() => buy(it)}
                  onEquip={() => equip(it)}
                >
                  <Preview item={it} />
                </ItemCard>
              ))}
            </div>
          )}
        </section>

        {/* Future items */}
        <section>
          <SectionHeader eyebrow="Whispers from the workshop" title="Future Wares" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <ComingSoonCard icon="🥚" name="Legendary Shadow Egg" hint="Hatch a mythical shadow" />
            <ComingSoonCard icon="🐴" name="Academy Mount" hint="Traverse the campus in style" />
            <ComingSoonCard icon="🏛️" name="Golden Residence Theme" hint="Bathe your room in gold" />
            <ComingSoonCard icon="🎆" name="Aurora Aura" hint="A dancing arcane halo" />
          </div>
        </section>
      </div>

      {/* Acquired overlay */}
      <AnimatePresence>
        {acquired && <AcquiredOverlay item={acquired} />}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Sub components ---------------- */

function EmporiumAmbience() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse at 10% 0%, color-mix(in oklab, #f59e0b 24%, transparent), transparent 55%), radial-gradient(ellipse at 90% 100%, color-mix(in oklab, var(--monarch) 30%, transparent), transparent 60%)",
        }}
      />
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-amber-200/70"
          style={{
            left: `${(i * 53) % 100}%`,
            top: `${(i * 29) % 100}%`,
            filter: "blur(0.5px)",
          }}
          animate={{ y: [0, -22, 0], opacity: [0.15, 0.9, 0.15] }}
          transition={{ duration: 5 + (i % 5), repeat: Infinity, delay: i * 0.25 }}
        />
      ))}
    </div>
  );
}

function MerchantBanner({ coins }: { coins: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rune-border holo-card monarch-glow relative overflow-hidden p-5"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 10% 0%, rgba(251, 191, 36, 0.28), transparent 55%), radial-gradient(circle at 100% 100%, color-mix(in oklab, var(--monarch) 32%, transparent), transparent 55%)",
        }}
      />
      <div className="relative flex items-start gap-4">
        <motion.div
          className="h-16 w-16 rounded-2xl grid place-items-center text-3xl shrink-0"
          style={{
            background: "var(--gradient-monarch)",
            boxShadow: "0 0 26px color-mix(in oklab, var(--monarch) 45%, transparent)",
          }}
          animate={{ rotate: [-2, 2, -2] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          🧙
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-orbitron uppercase tracking-[0.28em] text-[var(--rune)]">
            The Merchant speaks
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2">
            <Store className="h-6 w-6 text-amber-300" />
            Merchant's Emporium
          </h1>
          <p className="text-sm text-white/85 mt-1 italic max-w-2xl">
            "Welcome back, Cadet! Every item here has been earned through your hard work.
            Spend your Academy Coins wisely — rare wares reward patient scholars."
          </p>
        </div>
        <div
          className="rounded-2xl px-3 py-2 flex items-center gap-2 font-orbitron font-black shrink-0"
          style={{
            background: "linear-gradient(135deg, #fde68a, #f59e0b)",
            color: "#3a2408",
            boxShadow: "0 0 18px rgba(251, 191, 36, 0.45)",
          }}
        >
          <Coins className="h-5 w-5" /> {coins.toLocaleString()}
        </div>
      </div>
    </motion.div>
  );
}

function CounterCard({
  to, icon, eyebrow, title, caption, gradient,
}: {
  to: string; icon: React.ReactNode; eyebrow: string; title: string; caption: string; gradient: string;
}) {
  return (
    <Link to={to} className="group">
      <motion.div
        whileHover={{ y: -3 }}
        className="rune-border holo-card relative overflow-hidden p-4 h-full hover:monarch-glow transition-all"
      >
        <div
          className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full opacity-40"
          style={{ background: gradient, filter: "blur(30px)" }}
        />
        <div className="relative flex items-center gap-3">
          <div
            className="h-14 w-14 rounded-2xl grid place-items-center text-white shrink-0"
            style={{ background: gradient, boxShadow: `0 0 20px color-mix(in oklab, ${gradient.match(/#\w+/)?.[0] ?? "#7c3aed"} 40%, transparent)` }}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-orbitron uppercase tracking-[0.22em] text-[var(--rune)]">{eyebrow}</div>
            <div className="text-base font-extrabold truncate">{title}</div>
            <div className="text-[11px] text-muted-foreground truncate">{caption}</div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </div>
      </motion.div>
    </Link>
  );
}

function PassShowcase() {
  const passes = [
    { emoji: "🛡️", name: "Homework Shield", desc: "Skip one homework — teacher approval, once per month.", tint: "from-emerald-500/25 to-emerald-800/10" },
    { emoji: "🏖️", name: "Holiday Pass", desc: "One approved leave. Not usable during exams.", tint: "from-cyan-500/25 to-sky-800/10" },
    { emoji: "🔥", name: "Streak Shield", desc: "Protects one missed day of your streak.", tint: "from-orange-500/25 to-rose-800/10" },
    { emoji: "🎯", name: "Quiz Retry Token", desc: "Attempt any failed quiz once more.", tint: "from-fuchsia-500/25 to-purple-800/10" },
    { emoji: "⚗️", name: "XP Potion", desc: "Double XP for 24 hours.", tint: "from-amber-500/25 to-orange-700/10" },
  ];
  return (
    <section>
      <SectionHeader eyebrow="Pass Counter — Featured Scrolls" title="Merchant's Sealed Passes" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {passes.map((p) => (
          <Link
            key={p.name}
            to="/app/passes"
            className="rune-border holo-card relative overflow-hidden p-3 hover:monarch-glow transition-all block"
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-70", p.tint)} />
            <div className="relative">
              <div className="h-14 rounded-xl grid place-items-center text-3xl bg-white/5 border border-white/10">
                {p.emoji}
              </div>
              <div className="mt-2 flex items-center gap-1 text-sm font-extrabold truncate">
                <Scroll className="h-3.5 w-3.5 text-amber-300" /> {p.name}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{p.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function DailyDealCard({
  item, discountPct, coins, pending, onBuy,
}: {
  item: ShopItem; discountPct: number; coins: number; pending: boolean; onBuy: () => void;
}) {
  const price = Math.max(0, Math.round(item.price_coins * (1 - discountPct)));
  const canAfford = coins >= price;
  const rarity = RARITY[item.rarity];
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rune-border holo-card relative overflow-hidden p-4"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(251, 191, 36, 0.18), transparent 45%), radial-gradient(circle at 90% 110%, color-mix(in oklab, var(--monarch) 35%, transparent), transparent 55%)",
        }}
      />
      <div className="relative flex items-center gap-4">
        <div className="h-20 w-20 rounded-2xl bg-white/5 border border-white/10 grid place-items-center text-4xl">
          {itemIcon(item)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-orbitron uppercase tracking-[0.24em] text-amber-300">
            <Clock className="h-3 w-3" /> Daily Deal · resets in {hoursUntilTomorrow()}h
          </div>
          <div className="text-lg font-extrabold truncate">{item.name}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded", rarity.chip)}>
              {rarity.label}
            </span>
            <span className="text-[11px] text-muted-foreground line-through">{item.price_coins.toLocaleString()}</span>
            <span className="text-sm font-orbitron font-black text-amber-300 flex items-center gap-1">
              <Coins className="h-3.5 w-3.5" /> {price.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-emerald-300">−{Math.round(discountPct * 100)}%</span>
          </div>
          <Button
            size="sm"
            onClick={onBuy}
            disabled={pending || !canAfford || item.owned}
            className="mt-2 bg-[image:var(--gradient-gold)] text-amber-950 font-extrabold hover:opacity-90"
          >
            {item.owned ? "Already Owned" : canAfford ? "Snatch the Deal" : "Need more coins"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyDealCard() {
  return (
    <div className="rune-border holo-card p-4 text-sm text-muted-foreground grid place-items-center min-h-[120px]">
      No deal today — the Merchant is bartering with dragons.
    </div>
  );
}

function CoinGoalCard({
  goal, coins,
}: { goal: ShopItem | null; coins: number }) {
  if (!goal) {
    return (
      <div className="rune-border holo-card p-4 text-sm text-muted-foreground grid place-items-center min-h-[120px]">
        You've unlocked everything the Merchant offers. Legendary Cadet!
      </div>
    );
  }
  const pct = Math.min(100, Math.round((coins / goal.price_coins) * 100));
  const remaining = Math.max(0, goal.price_coins - coins);
  return (
    <div className="rune-border holo-card relative overflow-hidden p-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 100% 0%, color-mix(in oklab, var(--rune) 28%, transparent), transparent 55%)",
        }}
      />
      <div className="relative flex items-center gap-3 mb-3">
        <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-2xl">
          {itemIcon(goal)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-orbitron uppercase tracking-[0.22em] text-[var(--rune)]">
            Saving toward
          </div>
          <div className="text-base font-extrabold truncate">{goal.name}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-orbitron font-black text-amber-300 flex items-center gap-1 justify-end">
            <Coins className="h-3.5 w-3.5" /> {goal.price_coins.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground">{pct}%</div>
        </div>
      </div>
      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8 }}
          className="h-full"
          style={{ background: "linear-gradient(90deg, #f59e0b, #fde68a)" }}
        />
      </div>
      <div className="relative mt-2 text-[11px] text-muted-foreground">
        {remaining > 0
          ? <>You need <span className="text-amber-300 font-bold">{remaining.toLocaleString()}</span> more Academy Coins.</>
          : "You have enough coins — visit the shelf to claim it."}
      </div>
    </div>
  );
}

function ComingSoonCard({ icon, name, hint }: { icon: string; name: string; hint: string }) {
  return (
    <div className="rune-border holo-card relative overflow-hidden p-3 opacity-80">
      <div className="pointer-events-none absolute inset-0 backdrop-blur-[1px]" />
      <div className="relative">
        <div className="h-20 rounded-xl grid place-items-center text-4xl bg-white/5 border border-white/10 grayscale">
          {icon}
        </div>
        <div className="mt-2 flex items-center gap-1 text-sm font-extrabold truncate">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" /> {name}
        </div>
        <div className="text-[10px] text-muted-foreground line-clamp-2">{hint}</div>
        <div className="mt-2 text-[9px] font-orbitron uppercase tracking-[0.22em] text-amber-300">
          Coming Soon
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-3 px-1">
      <div className="text-[10px] font-orbitron uppercase tracking-[0.28em] text-[var(--rune)]">{eyebrow}</div>
      <h3 className="text-lg sm:text-xl font-extrabold">{title}</h3>
    </div>
  );
}

function ItemCard({
  item, equipped, coins, pending, onBuy, onEquip, children,
}: {
  item: ShopItem; equipped: boolean; coins: number; pending: boolean;
  onBuy: () => void; onEquip: () => void; children: React.ReactNode;
}) {
  const rarity = RARITY[item.rarity];
  const owned = item.owned || item.price_coins === 0;
  const canAfford = coins >= item.price_coins;
  const equippable = EQUIPPABLE.includes(item.type);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rune-border holo-card p-3 relative overflow-hidden",
        equipped && "monarch-glow",
      )}
    >
      <div
        className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, rgba(255,220,150,0.5), transparent 70%)" }}
      />
      {children}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-sm leading-tight truncate">{item.name}</div>
          <span className={cn("inline-block text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded mt-0.5", rarity.chip)}>
            {rarity.label}
          </span>
        </div>
        {!owned && (
          <div className="flex items-center gap-1 text-amber-300 font-extrabold text-sm tabular-nums">
            <Coins className="h-3.5 w-3.5" /> {item.price_coins}
          </div>
        )}
      </div>
      <div className="mt-2">
        {equipped ? (
          <Button size="sm" disabled className="w-full bg-success/20 text-success border border-success/50">
            <Check className="h-3.5 w-3.5 mr-1" /> Equipped
          </Button>
        ) : owned ? (
          equippable ? (
            <Button size="sm" onClick={onEquip} disabled={pending} className="w-full bg-[image:var(--gradient-primary)] font-bold">
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Equip
            </Button>
          ) : (
            <Button size="sm" disabled className="w-full bg-success/15 text-success border border-success/40">
              <Check className="h-3.5 w-3.5 mr-1" /> Collected
            </Button>
          )
        ) : canAfford ? (
          <Button size="sm" onClick={onBuy} disabled={pending} className="w-full bg-[image:var(--gradient-gold)] text-amber-950 font-extrabold hover:opacity-90">
            {pending ? "Bartering…" : "Unlock"}
          </Button>
        ) : (
          <Button size="sm" disabled className="w-full">
            <Lock className="h-3.5 w-3.5 mr-1" /> Need more coins
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function Preview({ item: it }: { item: ShopItem }) {
  const ring = RARITY[it.rarity].ring;
  const glow = RARITY[it.rarity].glow;
  const base = cn("h-24 rounded-xl flex items-center justify-center ring-2 relative", ring, glow);

  switch (it.type) {
    case "avatar":
      return <div className={cn(base, "text-5xl bg-gradient-to-br from-white/10 to-white/5")}>{it.value}</div>;
    case "frame":
      return (
        <div className={cn(base, "p-[4px]")} style={{ background: it.value }}>
          <div className="h-full w-full rounded-lg bg-card flex items-center justify-center text-3xl">🧑‍🎓</div>
        </div>
      );
    case "title":
      return (
        <div className={cn(base, "font-extrabold text-xl bg-gradient-to-br from-white/10 to-white/5")}>
          <span className={cn(it.rarity === "legendary" && "shimmer-gold")}>{it.value}</span>
        </div>
      );
    case "theme":
      return <div className={base} style={{ background: it.value }} />;
    case "name_color": {
      const isGradient = it.value.startsWith("linear-gradient");
      return (
        <div className={cn(base, "bg-gradient-to-br from-white/5 to-white/0")}>
          <span
            className="text-2xl font-extrabold bg-clip-text"
            style={
              isGradient
                ? { backgroundImage: it.value, WebkitBackgroundClip: "text", color: "transparent" }
                : { color: it.value }
            }
          >
            Hunter
          </span>
        </div>
      );
    }
    default:
      return <div className={cn(base, "text-5xl bg-gradient-to-br from-white/10 to-white/5")}>{it.value}</div>;
  }
}

function AcquiredOverlay({ item }: { item: ShopItem }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.7, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.8, y: -20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 20 }}
        className="rune-border holo-card monarch-glow relative overflow-hidden p-6 max-w-sm w-[92%] text-center"
      >
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          style={{
            background:
              "conic-gradient(from 0deg, var(--monarch) 0%, transparent 25%, #fbbf24 50%, transparent 75%, var(--monarch) 100%)",
            filter: "blur(18px)",
            opacity: 0.5,
          }}
        />
        <div className="relative">
          <div className="text-[10px] font-orbitron uppercase tracking-[0.28em] text-amber-300">
            Item Acquired
          </div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mx-auto mt-3 h-28 w-28 rounded-2xl bg-white/5 border border-white/15 grid place-items-center text-6xl"
          >
            {itemIcon(item)}
          </motion.div>
          <div className="mt-3 text-xl font-extrabold">{item.name}</div>
          <div className="text-xs text-muted-foreground">Congratulations, Cadet!</div>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15"
          >
            <Backpack className="h-3.5 w-3.5 text-emerald-300" /> Sent to Inventory Chest
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Helpers ---------------- */

function itemIcon(it: ShopItem): string {
  if (it.type === "avatar") return it.value;
  if (it.type === "frame") return "🖼️";
  if (it.type === "title") return "📜";
  if (it.type === "theme") return "🎨";
  if (it.type === "name_color") return "🖌️";
  if (it.type === "badge") return "🏅";
  if (it.type === "seasonal") return "🎉";
  if (it.type === "shadow_skin") return "👻";
  if (it.type === "pet_skin") return "🐾";
  if (it.type === "effect") return "✨";
  return "🎁";
}

function hoursUntilTomorrow(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  return Math.max(1, Math.round((tomorrow.getTime() - now.getTime()) / 3_600_000));
}

function pickDailyDeal(items: ShopItem[]): { item: ShopItem; discount: number } | null {
  const eligible = items.filter((i) => !i.owned && i.price_coins > 0);
  if (eligible.length === 0) return null;
  const day = Math.floor(Date.now() / 86_400_000);
  const item = eligible[day % eligible.length];
  const discountLevels = [0.15, 0.2, 0.25, 0.3];
  const discount = discountLevels[day % discountLevels.length];
  return { item, discount };
}

function pickCoinGoal(items: ShopItem[], coins: number): ShopItem | null {
  const affordable = items
    .filter((i) => !i.owned && i.price_coins > coins)
    .sort((a, b) => a.price_coins - b.price_coins);
  return affordable[0] ?? null;
}
