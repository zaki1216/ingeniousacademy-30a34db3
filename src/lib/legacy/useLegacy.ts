import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/AuthContext";
import { equipTitle, getAcademyLegacy } from "@/lib/api/legacy.functions";
import type { LegacyState } from "@/lib/legacy/config";

/**
 * Single source of truth for the Academy Legacy. Cached and reused by the
 * Legacy page, Hero Profile and My Academy so no query runs twice.
 */
export function useLegacy() {
  const { user } = useAuth();
  const fn = useServerFn(getAcademyLegacy);
  return useQuery<LegacyState>({
    queryKey: ["academy-legacy", user?.id],
    enabled: !!user?.id,
    queryFn: () => fn() as Promise<LegacyState>,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

export function useEquipTitle() {
  const qc = useQueryClient();
  const fn = useServerFn(equipTitle);
  return useMutation({
    mutationFn: (v: { code: string | null }) => fn({ data: v }),
    onSuccess: (res) => {
      toast.success(res.title ? `Title equipped: ${res.title}` : "Title removed");
      qc.invalidateQueries({ queryKey: ["academy-legacy"] });
      qc.invalidateQueries({ queryKey: ["hero-profile"] });
      qc.invalidateQueries({ queryKey: ["dorm"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not equip that title"),
  });
}
