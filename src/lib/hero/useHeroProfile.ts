import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { useAuth } from "@/lib/auth/AuthContext";
import { getHeroProfile } from "@/lib/api/hero.functions";

/**
 * Single source of truth for the Academy Hero Profile.
 * One query, reused by every section — no duplicate fetches.
 */
export function useHeroProfile() {
  const { user } = useAuth();
  const fn = useServerFn(getHeroProfile);
  return useQuery({
    queryKey: ["hero-profile", user?.id],
    enabled: !!user?.id,
    queryFn: () => fn(),
    staleTime: 60_000,
  });
}
