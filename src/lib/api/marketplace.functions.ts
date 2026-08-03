import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  adminDeleteMarketplaceItem,
  adminListMarketplaceItems,
  adminUpsertMarketplaceItem,
  equipMarketplaceItem,
  getMarketplaceState,
  purchaseMarketplaceItem,
  unequipMarketplaceSlot,
} from "@/lib/marketplace/engine.server";
import type { EquipSlot } from "@/lib/marketplace/config";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const getMarketplace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getMarketplaceState(context.userId));

export const purchaseItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ itemId: z.string().uuid(), equip: z.boolean().default(true) }).parse(d),
  )
  .handler(async ({ data, context }) =>
    purchaseMarketplaceItem(context.userId, data.itemId, data.equip),
  );

export const equipItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ itemId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => equipMarketplaceItem(context.userId, data.itemId));

export const unequipSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slot: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) =>
    unequipMarketplaceSlot(context.userId, data.slot as EquipSlot),
  );

/* --------------------------------- Admin --------------------------------- */

export const adminListItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    return adminListMarketplaceItems();
  });

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  shop_code: z.string().min(1).max(64),
  type: z.string().min(1).max(48),
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  value: z.string().min(1).max(400),
  description: z.string().max(400).nullable().optional(),
  icon: z.string().max(400).nullable().optional(),
  price_coins: z.number().int().min(0),
  rarity: z.enum(["common", "rare", "epic", "legendary"]),
  sort_order: z.number().int().min(0),
  enabled: z.boolean(),
  release_at: z.string().nullable().optional(),
});

export const adminUpsertItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => itemSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    return adminUpsertMarketplaceItem(data);
  });

export const adminDeleteItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    return adminDeleteMarketplaceItem(data.id);
  });
