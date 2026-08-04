/**
 * My Academy (Dorm Room) — server-only engine.
 *
 * Read projection + slot persistence. Purely cosmetic: it never touches XP,
 * Coins, progress, attendance or the curriculum. Decorations are ordinary
 * Marketplace items, so ownership comes from `user_inventory`.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ACHIEVEMENTS, evaluateAll } from "@/lib/hero/catalog";
import { computeHeroProfile } from "@/lib/hero/profile.server";
import { rankFromXp } from "@/lib/rpg/academyRanks";
import {
  DORM_SHOP_CODE,
  DORM_SLOT_BY_ID,
  type DormDecoration,
  type DormLayout,
  type DormState,
  type DormTrophy,
} from "@/lib/dorm/config";

async function loadLayout(userId: string): Promise<DormLayout> {
  const { data } = await supabaseAdmin
    .from("dorm_layouts")
    .select("slots")
    .eq("user_id", userId)
    .maybeSingle();
  const raw = (data?.slots ?? {}) as Record<string, unknown>;
  const layout: DormLayout = {};
  for (const [slotId, itemId] of Object.entries(raw)) {
    if (DORM_SLOT_BY_ID.has(slotId)) layout[slotId] = typeof itemId === "string" ? itemId : null;
  }
  return layout;
}

async function loadOwnedDecorations(userId: string): Promise<DormDecoration[]> {
  const { data: inv } = await supabaseAdmin
    .from("user_inventory")
    .select("item_id")
    .eq("user_id", userId);
  const ids = (inv ?? []).map((r) => r.item_id);
  if (!ids.length) return [];
  const { data } = await supabaseAdmin
    .from("shop_items")
    .select("id, code, type, name, value, icon, description, rarity, price_coins")
    .eq("shop_code", DORM_SHOP_CODE)
    .in("id", ids)
    .order("sort_order", { ascending: true });
  return (data ?? []) as unknown as DormDecoration[];
}

async function loadTrophies(userId: string, xp: number): Promise<DormTrophy[]> {
  const trophies: DormTrophy[] = [];

  const { data: completions } = await supabaseAdmin
    .from("chapter_completions")
    .select("id, completed_at, chapters(chapter_name)")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(24);

  for (const c of completions ?? []) {
    const name = (c as { chapters?: { chapter_name?: string } }).chapters?.chapter_name ?? "Dungeon";
    trophies.push({
      id: `dungeon-${c.id}`,
      icon: "🏆",
      name,
      detail: "Dungeon cleared",
      kind: "dungeon",
    });
  }

  const { data: ranks } = await supabaseAdmin
    .from("academy_ranks")
    .select("code, name, icon, color, gradient, xp_required, sort_order, enabled, message")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });
  const rank = rankFromXp(xp, (ranks ?? []) as never);
  if (rank) {
    trophies.push({
      id: `rank-${rank.code}`,
      icon: rank.icon || "🎖️",
      name: rank.name,
      detail: "Academy Rank earned",
      kind: "rank",
    });
  }

  return trophies;
}

export async function getDormState(userId: string): Promise<DormState> {
  const hero = await computeHeroProfile(userId);
  const [layout, owned, trophies, profileRes] = await Promise.all([
    loadLayout(userId),
    loadOwnedDecorations(userId),
    loadTrophies(userId, hero.stats.xp),
    supabaseAdmin
      .from("profiles")
      .select("equipped_badge")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const { data: ranks } = await supabaseAdmin
    .from("academy_ranks")
    .select("code, name, icon, color, gradient, xp_required, sort_order, enabled, message")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });
  const rank = rankFromXp(hero.stats.xp, (ranks ?? []) as never);

  const achievements = evaluateAll(ACHIEVEMENTS, hero.stats, hero.journey).map((a) => ({
    code: a.code,
    name: a.name,
    description: a.description,
    icon: a.icon,
    rarity: a.rarity,
    unlocked: a.unlocked,
    percent: a.percent,
  }));

  return {
    hero: {
      name: hero.identity.name,
      username: hero.identity.username,
      avatar: hero.identity.avatar,
      frame: hero.identity.frame,
      title: hero.identity.title,
      badge: (profileRes.data?.equipped_badge as string | null) ?? null,
      level: hero.stats.level,
      xp: hero.stats.xp,
      coins: hero.stats.coins,
      rankName: rank?.name ?? null,
      rankIcon: rank?.icon ?? null,
      rankColor: rank?.color ?? null,
    },
    layout,
    owned,
    trophies,
    achievements,
  };
}

/** Place (or clear, with `itemId: null`) one owned decoration in one slot. */
export async function setDormSlot(userId: string, slotId: string, itemId: string | null) {
  const slot = DORM_SLOT_BY_ID.get(slotId);
  if (!slot) throw new Error("Unknown room slot.");

  if (itemId) {
    const { data: item } = await supabaseAdmin
      .from("shop_items")
      .select("id, type, shop_code")
      .eq("id", itemId)
      .maybeSingle();
    if (!item || item.shop_code !== DORM_SHOP_CODE) throw new Error("That is not a room decoration.");
    if (item.type !== slot.category) throw new Error(`That item does not fit the ${slot.label} slot.`);

    const { data: owned } = await supabaseAdmin
      .from("user_inventory")
      .select("item_id")
      .eq("user_id", userId)
      .eq("item_id", itemId)
      .maybeSingle();
    if (!owned) throw new Error("You do not own this decoration yet.");
  }

  const current = await loadLayout(userId);
  const next = { ...current, [slotId]: itemId };

  const { error } = await supabaseAdmin
    .from("dorm_layouts")
    .upsert({ user_id: userId, slots: next }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);

  return { ok: true as const, layout: next };
}
