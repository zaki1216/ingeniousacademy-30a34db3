import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { useAuth } from "@/lib/auth/AuthContext";
import { equipItem, getMarketplace, purchaseItem, unequipSlot } from "@/lib/api/marketplace.functions";
import type { EquipSlot } from "@/lib/marketplace/config";

/** Single cached source of truth for the Marketplace (items + coins + equipped). */
export function useMarketplace() {
  const { user } = useAuth();
  const fn = useServerFn(getMarketplace);
  return useQuery({
    queryKey: ["marketplace", user?.id],
    enabled: !!user?.id,
    queryFn: () => fn(),
    staleTime: 60_000,
  });
}

/** Purchase / equip mutations — they refresh the Hero Profile & HUD too. */
export function useMarketplaceActions() {
  const qc = useQueryClient();
  const buyFn = useServerFn(purchaseItem);
  const equipFn = useServerFn(equipItem);
  const unequipFn = useServerFn(unequipSlot);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["marketplace"] });
    qc.invalidateQueries({ queryKey: ["hero-profile"] });
    qc.invalidateQueries({ queryKey: ["world-profile"] });
    qc.invalidateQueries({ queryKey: ["gamification"] });
    qc.invalidateQueries({ queryKey: ["hud-stats"] });
  };

  const buy = useMutation({
    mutationFn: (vars: { itemId: string; equip?: boolean }) =>
      buyFn({ data: { itemId: vars.itemId, equip: vars.equip ?? true } }),
    onSuccess: invalidate,
  });

  const equip = useMutation({
    mutationFn: (itemId: string) => equipFn({ data: { itemId } }),
    onSuccess: invalidate,
  });

  const unequip = useMutation({
    mutationFn: (slot: EquipSlot) => unequipFn({ data: { slot } }),
    onSuccess: invalidate,
  });

  return { buy, equip, unequip };
}
