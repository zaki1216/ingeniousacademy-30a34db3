import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { getDorm, placeDormItem } from "@/lib/api/dorm.functions";
import type { DormState } from "@/lib/dorm/config";

export function useDorm() {
  const fn = useServerFn(getDorm);
  return useQuery<DormState>({
    queryKey: ["dorm"],
    queryFn: () => fn() as Promise<DormState>,
    staleTime: 30_000,
  });
}

export function useDormActions() {
  const qc = useQueryClient();
  const place = useServerFn(placeDormItem);

  const placeItem = useMutation({
    mutationFn: (v: { slotId: string; itemId: string | null }) => place({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dorm"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save your room"),
  });

  return { placeItem };
}
