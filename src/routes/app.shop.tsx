import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "framer-motion";
import { Coins, Check, Lock, ShoppingBag, Sparkles, Ticket, Gift, ChevronRight } from "lucide-react";
import { toast } from "sonner";


import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getShop, purchaseShopItem, equipShopItem } from "@/lib/api/shop.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/shop")({ component: ShopPage });

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

const CATEGORIES: { key: ShopType; label: string }[] = [
  { key: "avatar",      label: "Avatars" },
  { key: "frame",       label: "Frames" },
  { key: "title",       label: "Titles" },
  { key: "theme",       label: "Themes" },
  { key: "name_color",  label: "Name Color" },
  { key: "badge",       label: "Badges" },
  { key: "seasonal",    label: "Seasonal" },
  { key: "shadow_skin", label: "Shadows" },
  { key: "pet_skin",    label: "Pet Skins" },
  { key: "effect",      label: "Effects" },
];

function ShopPage() {
  const qc = useQueryClient();
  const getShopFn = useServerFn(getShop);
  const buyFn = useServerFn(purchaseShopItem);
  const equipFn = useServerFn(equipShopItem);

  const shop = useQuery({ queryKey: ["shop"], queryFn: () => getShopFn() });
  const [pending, setPending] = useState<string | null>(null);

  const items = (shop.data?.items ?? []) as ShopItem[];
  const coins = shop.data?.coins ?? 0;
  const equipped = shop.data?.equipped;

  function isEquipped(it: ShopItem) {
    if (!equipped) return false;
    if (it.type === "avatar") return equipped.avatar === it.value;
    if (it.type === "frame") return equipped.frame === it.value;
    if (it.type === "title") return equipped.title === it.value;
    return false;
  }

  async function buy(it: ShopItem) {
    if (coins < it.price_coins) {
      toast.error("Not enough coins");
      return;
    }
    setPending(it.id);
    try {
      await buyFn({ data: { itemId: it.id } });
      toast.success(`Unlocked ${it.name}!`);
      await qc.invalidateQueries({ queryKey: ["shop"] });
      await qc.invalidateQueries({ queryKey: ["gam-dashboard"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  async function equip(it: ShopItem) {
    if (!EQUIPPABLE.includes(it.type)) {
      toast.success(`${it.name} is in your collection`);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">Hero Shop</div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary-glow" /> Spend your coins
          </h1>
        </div>
        <div className="rounded-2xl bg-[image:var(--gradient-gold)] text-amber-950 px-4 py-2 flex items-center gap-2 font-extrabold shadow-lg glow-gold">
          <Coins className="h-5 w-5" /> {coins.toLocaleString()}
        </div>
      </div>

      <Tabs defaultValue="avatar">
        <TabsList className="w-full flex overflow-x-auto no-scrollbar gap-1 justify-start">
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.key} value={c.key} className="text-xs shrink-0">
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((c) => {
          const list = items.filter((i) => i.type === c.key);
          return (
            <TabsContent key={c.key} value={c.key} className="mt-4">
              {list.length === 0 ? (
                <div className="rounded-2xl glass-card p-6 text-center text-sm text-muted-foreground">
                  No {c.label.toLowerCase()} available yet — restock soon.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {list.map((it) => (
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
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function Preview({ item: it }: { item: ShopItem }) {
  const ring = RARITY[it.rarity].ring;
  const glow = RARITY[it.rarity].glow;
  const base = cn("h-24 rounded-xl flex items-center justify-center ring-2", ring, glow);

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
    case "badge":
    case "seasonal":
    case "shadow_skin":
    case "pet_skin":
    case "effect":
      return <div className={cn(base, "text-5xl bg-gradient-to-br from-white/10 to-white/5")}>{it.value}</div>;
    default:
      return <div className={base}>{it.value}</div>;
  }
}

function ItemCard({
  item, equipped, coins, pending, onBuy, onEquip, children,
}: {
  item: ShopItem;
  equipped: boolean;
  coins: number;
  pending: boolean;
  onBuy: () => void;
  onEquip: () => void;
  children: React.ReactNode;
}) {
  const rarity = RARITY[item.rarity];
  const owned = item.owned || item.price_coins === 0;
  const canAfford = coins >= item.price_coins;
  const equippable = EQUIPPABLE.includes(item.type);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-2xl glass-card p-3", equipped && "glow-primary")}
    >
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
            Unlock
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
