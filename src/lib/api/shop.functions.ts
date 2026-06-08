import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getShop = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const [itemsRes, invRes, statsRes, profileRes] = await Promise.all([
      supabaseAdmin.from("shop_items").select("*").order("type").order("sort_order"),
      supabaseAdmin.from("user_inventory").select("item_id").eq("user_id", userId),
      supabaseAdmin.from("gamification_stats").select("coins").eq("user_id", userId).maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("equipped_avatar, equipped_frame, equipped_title")
        .eq("id", userId)
        .maybeSingle(),
    ]);
    const owned = new Set((invRes.data ?? []).map((r) => r.item_id));
    return {
      items: (itemsRes.data ?? []).map((i) => ({ ...i, owned: owned.has(i.id) })),
      coins: statsRes.data?.coins ?? 0,
      equipped: {
        avatar: profileRes.data?.equipped_avatar ?? null,
        frame: profileRes.data?.equipped_frame ?? null,
        title: profileRes.data?.equipped_title ?? null,
      },
    };
  });

export const purchaseShopItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ itemId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: item } = await supabaseAdmin
      .from("shop_items")
      .select("*")
      .eq("id", data.itemId)
      .maybeSingle();
    if (!item) throw new Error("Item not found");
    const { data: existing } = await supabaseAdmin
      .from("user_inventory")
      .select("item_id")
      .eq("user_id", userId)
      .eq("item_id", item.id)
      .maybeSingle();
    if (existing) return { ok: true, alreadyOwned: true };
    const { data: stats } = await supabaseAdmin
      .from("gamification_stats")
      .select("coins")
      .eq("user_id", userId)
      .maybeSingle();
    const coins = stats?.coins ?? 0;
    if (coins < item.price_coins) throw new Error("Not enough coins");
    const newCoins = coins - item.price_coins;
    await supabaseAdmin
      .from("gamification_stats")
      .update({ coins: newCoins, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    await supabaseAdmin.from("user_inventory").insert({ user_id: userId, item_id: item.id });
    await supabaseAdmin.from("coin_transactions").insert({
      user_id: userId,
      amount: -item.price_coins,
      reason: "shop_purchase",
      metadata: { code: item.code, name: item.name },
    });
    return { ok: true, alreadyOwned: false, newCoins };
  });

export const equipShopItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ itemId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: item } = await supabaseAdmin
      .from("shop_items")
      .select("*")
      .eq("id", data.itemId)
      .maybeSingle();
    if (!item) throw new Error("Item not found");
    // Default items are free to equip; otherwise must own
    if (item.price_coins > 0) {
      const { data: owned } = await supabaseAdmin
        .from("user_inventory")
        .select("item_id")
        .eq("user_id", userId)
        .eq("item_id", item.id)
        .maybeSingle();
      if (!owned) throw new Error("You don't own this item");
    }
    const col =
      item.type === "avatar"
        ? "equipped_avatar"
        : item.type === "frame"
          ? "equipped_frame"
          : "equipped_title";
    await supabaseAdmin
      .from("profiles")
      .update({ [col]: item.value })
      .eq("id", userId);
    return { ok: true };
  });
