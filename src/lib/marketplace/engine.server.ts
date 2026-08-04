/**
 * Academy Marketplace — server-only engine.
 *
 * Read-only projection + coin-safe purchase/equip logic. Kept out of
 * *.functions.ts so the server-fn splitter only ever sees thin wrappers.
 *
 * Coins remain the only currency; XP, ranks, missions and Guardian rewards
 * are never touched here.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isDormType } from "@/lib/dorm/config";
import {
  SLOT_COLUMN,
  slotForType,
  type EquipSlot,
  type MarketplaceItem,
  type MarketplaceItemState,
  type MarketplaceState,
} from "@/lib/marketplace/config";

const EMPTY_EQUIPPED: Record<EquipSlot, string | null> = {
  avatar: null,
  outfit: null,
  frame: null,
  title: null,
  badge: null,
  nameplate: null,
  theme: null,
  celebration: null,
};

const EQUIP_SELECT = Object.values(SLOT_COLUMN).join(", ");

function readEquipped(profile: Record<string, unknown> | null): Record<EquipSlot, string | null> {
  const out = { ...EMPTY_EQUIPPED };
  for (const [slot, column] of Object.entries(SLOT_COLUMN)) {
    out[slot as EquipSlot] = (profile?.[column] as string | null) ?? null;
  }
  return out;
}

function decorate(
  items: MarketplaceItem[],
  owned: Set<string>,
  equipped: Record<EquipSlot, string | null>,
  coins: number,
): MarketplaceItemState[] {
  const now = Date.now();
  return items.map((it) => {
    const slot = slotForType(it.type);
    const isOwned = owned.has(it.id);
    return {
      ...it,
      slot,
      owned: isOwned,
      equipped: isOwned && equipped[slot] === it.value,
      affordable: coins >= it.price_coins,
      upcoming: !!it.release_at && new Date(it.release_at).getTime() > now,
    };
  });
}

export async function getMarketplaceState(userId: string): Promise<MarketplaceState> {
  const [itemsRes, invRes, statsRes, profileRes] = await Promise.all([
    supabaseAdmin
      .from("shop_items")
      .select(
        "id, shop_code, type, code, name, value, description, icon, price_coins, rarity, sort_order, enabled, release_at",
      )
      .eq("enabled", true)
      .order("sort_order", { ascending: true }),
    supabaseAdmin.from("user_inventory").select("item_id").eq("user_id", userId),
    supabaseAdmin.from("gamification_stats").select("coins").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("profiles").select(EQUIP_SELECT).eq("id", userId).maybeSingle(),
  ]);

  const coins = statsRes.data?.coins ?? 0;
  const equipped = readEquipped(profileRes.data as Record<string, unknown> | null);
  const owned = new Set((invRes.data ?? []).map((r) => r.item_id));
  const items = (itemsRes.data ?? []) as unknown as MarketplaceItem[];

  return { coins, equipped, items: decorate(items, owned, equipped, coins) };
}

export type PurchaseResult = {
  ok: true;
  coins: number;
  itemId: string;
  equipped: boolean;
};

export async function purchaseMarketplaceItem(
  userId: string,
  itemId: string,
  autoEquip: boolean,
): Promise<PurchaseResult> {
  const { data: item } = await supabaseAdmin
    .from("shop_items")
    .select("id, type, name, value, price_coins, enabled, release_at")
    .eq("id", itemId)
    .maybeSingle();
  if (!item || !item.enabled) throw new Error("This item is not available.");
  if (item.release_at && new Date(item.release_at).getTime() > Date.now()) {
    throw new Error("This item has not been released yet.");
  }

  const { data: existing } = await supabaseAdmin
    .from("user_inventory")
    .select("item_id")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .maybeSingle();
  if (existing) throw new Error("You already own this item.");

  const { data: stats } = await supabaseAdmin
    .from("gamification_stats")
    .select("coins")
    .eq("user_id", userId)
    .maybeSingle();
  const coins = stats?.coins ?? 0;
  const price = item.price_coins ?? 0;
  if (coins < price) throw new Error("Not enough coins yet — keep questing!");

  const newCoins = coins - price;
  if (price > 0) {
    const { error: coinErr } = await supabaseAdmin
      .from("gamification_stats")
      .update({ coins: newCoins })
      .eq("user_id", userId)
      .eq("coins", coins);
    if (coinErr) throw new Error(coinErr.message);
    await supabaseAdmin.from("coin_transactions").insert({
      user_id: userId,
      amount: -price,
      reason: "marketplace_purchase",
      metadata: { item_id: itemId, name: item.name },
    });
  }

  const { error: invErr } = await supabaseAdmin
    .from("user_inventory")
    .insert({ user_id: userId, item_id: itemId });
  if (invErr) throw new Error(invErr.message);

  let didEquip = false;
  // Dorm decorations are placed in the room, never equipped on the hero.
  if (autoEquip && !isDormType(item.type)) {
    await equipMarketplaceItem(userId, itemId);
    didEquip = true;
  }

  return { ok: true, coins: newCoins, itemId, equipped: didEquip };
}

export async function equipMarketplaceItem(userId: string, itemId: string) {
  const { data: item } = await supabaseAdmin
    .from("shop_items")
    .select("id, type, value")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) throw new Error("Item not found.");

  const { data: owned } = await supabaseAdmin
    .from("user_inventory")
    .select("item_id")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .maybeSingle();
  if (!owned) throw new Error("You do not own this item.");

  const column = SLOT_COLUMN[slotForType(item.type)];
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ [column]: item.value } as never)
    .eq("id", userId);
  if (error) throw new Error(error.message);
  return { ok: true as const, slot: slotForType(item.type), value: item.value };
}

export async function unequipMarketplaceSlot(userId: string, slot: EquipSlot) {
  const column = SLOT_COLUMN[slot];
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ [column]: null } as never)
    .eq("id", userId);
  if (error) throw new Error(error.message);
  return { ok: true as const, slot };
}

/* ------------------------------- Admin side ------------------------------- */

export async function adminListMarketplaceItems(): Promise<MarketplaceItem[]> {
  const { data, error } = await supabaseAdmin
    .from("shop_items")
    .select(
      "id, shop_code, type, code, name, value, description, icon, price_coins, rarity, sort_order, enabled, release_at",
    )
    .order("shop_code", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MarketplaceItem[];
}

export type MarketplaceItemInput = {
  id?: string;
  shop_code: string;
  type: string;
  code: string;
  name: string;
  value: string;
  description?: string | null;
  icon?: string | null;
  price_coins: number;
  rarity: string;
  sort_order: number;
  enabled: boolean;
  release_at?: string | null;
};

export async function adminUpsertMarketplaceItem(input: MarketplaceItemInput) {
  const row = {
    shop_code: input.shop_code,
    type: input.type,
    code: input.code,
    name: input.name,
    value: input.value,
    description: input.description ?? null,
    icon: input.icon ?? null,
    price_coins: input.price_coins,
    rarity: input.rarity,
    sort_order: input.sort_order,
    enabled: input.enabled,
    release_at: input.release_at || null,
  };
  const query = input.id
    ? supabaseAdmin.from("shop_items").update(row).eq("id", input.id)
    : supabaseAdmin.from("shop_items").insert(row);
  const { error } = await query;
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function adminDeleteMarketplaceItem(id: string) {
  const { error } = await supabaseAdmin.from("shop_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}
