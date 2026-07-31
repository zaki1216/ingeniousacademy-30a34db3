import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { useAuth } from "@/lib/auth/AuthContext";
import { getContinueLearning, getDailyMissions } from "@/lib/api/learning.functions";

/** Shared query for the Continue Learning Engine — cached across every screen. */
export function useContinueLearning() {
  const { user, role } = useAuth();
  const fn = useServerFn(getContinueLearning);
  return useQuery({
    queryKey: ["continue-learning", user?.id],
    enabled: !!user?.id && role === "student",
    queryFn: () => fn(),
    staleTime: 30_000,
  });
}

export function useDailyMissions() {
  const { user, role } = useAuth();
  const fn = useServerFn(getDailyMissions);
  return useQuery({
    queryKey: ["daily-missions", user?.id],
    enabled: !!user?.id && role === "student",
    queryFn: () => fn(),
    staleTime: 30_000,
  });
}
