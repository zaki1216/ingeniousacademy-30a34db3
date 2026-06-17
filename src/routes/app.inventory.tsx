import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import {
  Backpack,
  Ticket,
  FlaskConical,
  Key,
  Gift,
  Award,
  Sparkles,
  Ghost,
  PawPrint,
  Search,
  Lock,
} from "lucide-react";

import { useAuth } from "@/lib/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getShop } from "@/lib/api/shop.functions";
import { PETS, getOwnedPetIds, getEquippedPetId, rarityColor } from "@/lib/rpg/pets";
import { PetCompanion } from "@/components/rpg/PetCompanion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/inventory")({
  component: InventoryPage,
});

type Category =
  | "all"
  | "passes"
  | "potions"
  | "keys"
  | "rewards"
  | "badges"
  | "special"
  | "shadows"
  | "pets";

type InvItem = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic";
  category: Exclude<Category, "all">;
  count?: number;
  owned: boolean;
  locked?: boolean;
  meta?: string;
};

const CATEGORIES: { id: Category; label: string; icon: typeof Backpack; tint: string }[] = [
  { id: "all", label: "All Loot", icon: Backpack, tint: "#a78bfa" },
  { id: "passes", label: "Passes", icon: Ticket, tint: "#22d3ee" },
  { id: "potions", label: "Potions", icon: FlaskConical, tint: "#34d399" },
  { id: "keys", label: "Keys", icon: Key, tint: "#fbbf24" },
  { id: "rewards", label: "Rewards", icon: Gift, tint: "#f472b6" },
  { id: "badges", label: "Badges", icon: Award, tint: "#fb923c" },
  { id: "special", label: "Special", icon: Sparkles, tint: "#a855f7" },
  { id: "shadows", label: "Shadows", icon: Ghost, tint: "#64748b" },
  { id: "pets", label: "Pets", icon: PawPrint, tint: "#ec4899" },
];

function normalizeRarity(r?: string): InvItem["rarity"] {
  const v = (r ?? "common").toLowerCase();
  if (["common", "rare", "epic", "legendary", "mythic"].includes(v)) return v as InvItem["rarity"];
  return "common";
}

function InventoryPage() {
  const { user } = useAuth();
  const [active, setActive] = useState<Category>("all");
  const [query, setQuery] = useState("");

  const getShopFn = useServerFn(getShop);
  const shop = useQuery({
    queryKey: ["inventory-shop", user?.id],
    enabled: !!user?.id,
    queryFn: () => getShopFn(),
    staleTime: 60_000,
  });

  const achievements = useQuery({
    queryKey: ["inventory-achievements", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_achievements")
        .select("unlocked_at, achievements(id, name, description, icon, category)")
        .eq("user_id", user!.id);
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const items: InvItem[] = useMemo(() => {
    const out: InvItem[] = [];

    // Special items / passes from shop (owned only)
    for (const it of shop.data?.items ?? []) {
      if (!it.owned) continue;
      const cat: InvItem["category"] =
        it.type === "frame" ? "passes" : it.type === "title" ? "rewards" : "special";
      out.push({
        id: it.id,
        name: it.name,
        description:
          it.type === "avatar"
            ? "Equipable avatar"
            : it.type === "frame"
              ? "Profile frame pass"
              : "Title decoration",
        emoji: it.type === "avatar" ? it.value : it.type === "frame" ? "🖼️" : "🏷️",
        rarity: normalizeRarity(it.rarity),
        category: cat,
        owned: true,
      });
    }

    // Badges (achievements)
    for (const ua of achievements.data ?? []) {
      const a = (ua as any).achievements;
      if (!a) continue;
      out.push({
        id: `ach-${a.id}`,
        name: a.name,
        description: a.description,
        emoji: a.icon || "🏅",
        rarity: "epic",
        category: "badges",
        owned: true,
      });
    }

    // Pets
    const ownedPets = new Set(getOwnedPetIds());
    const equippedPet = getEquippedPetId();
    for (const p of PETS) {
      out.push({
        id: `pet-${p.id}`,
        name: p.name,
        description: p.description,
        emoji: p.emoji,
        rarity: p.rarity,
        category: "pets",
        owned: ownedPets.has(p.id),
        locked: !ownedPets.has(p.id),
        meta: equippedPet === p.id ? "Equipped" : p.subject,
      });
    }

    return out;
  }, [shop.data, achievements.data]);

  const counts = useMemo(() => {
    const c: Record<Category, number> = {
      all: 0, passes: 0, potions: 0, keys: 0,
      rewards: 0, badges: 0, special: 0, shadows: 0, pets: 0,
    };
    for (const it of items) {
      if (!it.owned) continue;
      c.all += 1;
      c[it.category] += 1;
    }
    return c;
  }, [items]);

  const filtered = items
    .filter((i) => active === "all" || i.category === active)
    .filter((i) => (active === "all" ? i.owned : true))
    .filter((i) => !query || i.name.toLowerCase().includes(query.toLowerCase()));

  const totalOwned = counts.all;

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="rune-border holo-card relative overflow-hidden p-5">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 10% 0%, color-mix(in oklab,#7c3aed 40%, transparent), transparent 55%), radial-gradient(circle at 90% 110%, color-mix(in oklab,#22d3ee 30%, transparent), transparent 50%)",
          }}
        />
        <div className="relative flex items-center gap-4">
          <div className="grid place-items-center h-16 w-16 rounded-2xl bg-[image:var(--gradient-primary)] glow-primary shadow-[var(--shadow-elegant)]">
            <Backpack className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-orbitron font-bold tracking-[0.22em] text-[var(--rune)]">
              HUNTER'S BACKPACK
            </div>
            <h1 className="text-2xl font-extrabold">Inventory</h1>
            <p className="text-sm text-muted-foreground">
              {totalOwned} item{totalOwned === 1 ? "" : "s"} in your satchel · loot, badges,
              shadows & familiars
            </p>
          </div>
          <div className="relative hidden sm:block w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search loot…"
              className="pl-8 h-9 bg-white/5 border-white/10"
            />
          </div>
        </div>
      </header>

      {/* Category rail */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const isActive = active === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={cn(
                "shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all font-orbitron text-[11px] font-bold tracking-wider uppercase",
                isActive
                  ? "border-transparent text-white shadow-[var(--shadow-glow)]"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10",
              )}
              style={
                isActive
                  ? {
                      background: `linear-gradient(135deg, ${c.tint}, color-mix(in oklab, ${c.tint} 60%, #000))`,
                    }
                  : undefined
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {c.label}
              <span
                className="ml-1 px-1.5 py-0.5 rounded-md text-[10px]"
                style={{
                  background: isActive ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.06)",
                }}
              >
                {counts[c.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5"
        >
          {filtered.map((it) => (
            <ItemSlot key={it.id} item={it} />
          ))}
          {/* Slot placeholders to keep "backpack" feel */}
          {Array.from({ length: Math.max(0, 16 - filtered.length) }).map((_, i) => (
            <EmptySlot key={`empty-${i}`} />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Empty / coming soon banners for un-backed categories */}
      {active === "potions" && counts.potions === 0 && (
        <ComingSoon
          icon={<FlaskConical className="h-5 w-5" />}
          title="No potions yet"
          body="Brew XP elixirs and streak shields in upcoming alchemy update."
        />
      )}
      {active === "keys" && counts.keys === 0 && (
        <ComingSoon
          icon={<Key className="h-5 w-5" />}
          title="No keys collected"
          body="Defeat dungeon bosses to claim shadow keys."
          to="/app/worlds"
          cta="Enter Worlds"
        />
      )}
      {active === "shadows" && (
        <ComingSoon
          icon={<Ghost className="h-5 w-5" />}
          title="Shadow Army"
          body="Awakened shadows from cleared dungeons appear here. Visit a dungeon's boss to begin extraction."
          to="/app/worlds"
          cta="View Dungeons"
        />
      )}
    </div>
  );
}

function ItemSlot({ item }: { item: InvItem }) {
  const r = item.rarity;
  const color =
    r === "common"
      ? "#94a3b8"
      : r === "rare"
        ? "#38bdf8"
        : r === "epic"
          ? "#a855f7"
          : r === "legendary"
            ? "#f59e0b"
            : "#ec4899";

  const isPet = item.category === "pets";
  const pet = isPet ? PETS.find((p) => `pet-${p.id}` === item.id) : null;

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.05, y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "group relative aspect-square rounded-xl border p-2 flex flex-col items-center justify-center text-center overflow-hidden cursor-default",
        item.locked ? "border-white/5 bg-white/[0.02]" : "border-white/10 bg-white/[0.04]",
      )}
      style={{
        boxShadow: item.owned ? `inset 0 0 0 1px ${color}33, 0 0 16px ${color}22` : undefined,
      }}
      title={`${item.name} — ${item.description}`}
    >
      {/* rarity gleam */}
      {item.owned && (
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 0%, ${color}55, transparent 70%)` }}
        />
      )}

      <div
        className={cn(
          "relative text-2xl leading-none",
          item.locked && "grayscale opacity-40",
        )}
      >
        {isPet && pet ? (
          <PetCompanion pet={pet} size="md" showRing={false} />
        ) : (
          <span>{item.emoji}</span>
        )}
      </div>

      <div className="relative mt-1.5 w-full">
        <div className="text-[10px] font-bold leading-tight truncate text-foreground">
          {item.name}
        </div>
        {item.meta ? (
          <div
            className="text-[8px] font-orbitron tracking-wider uppercase truncate"
            style={{ color: color }}
          >
            {item.meta}
          </div>
        ) : item.count && item.count > 1 ? (
          <div className="text-[8px] text-muted-foreground">×{item.count}</div>
        ) : null}
      </div>

      {item.locked && (
        <div className="absolute top-1 right-1">
          <Lock className="h-3 w-3 text-muted-foreground" />
        </div>
      )}

      {/* rarity dot */}
      {item.owned && (
        <div
          className="absolute top-1 left-1 h-1.5 w-1.5 rounded-full"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
        />
      )}
    </motion.div>
  );
}

function EmptySlot() {
  return (
    <div
      className="aspect-square rounded-xl border border-dashed border-white/5 bg-white/[0.015]"
      aria-hidden
    />
  );
}

function ComingSoon({
  icon,
  title,
  body,
  to,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  to?: string;
  cta?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-start gap-3">
      <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">{title}</div>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
      {to && cta && (
        <Link
          to={to}
          className="self-center text-xs font-orbitron font-bold tracking-wider uppercase px-3 py-1.5 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"
        >
          {cta}
        </Link>
      )}
    </div>
  );
}

// Avoid unused rarityColor warning — re-export friendliness for future use
void rarityColor;
