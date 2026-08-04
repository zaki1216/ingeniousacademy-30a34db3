import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getDormState, setDormSlot } from "@/lib/dorm/engine.server";

export const getDorm = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getDormState(context.userId));

export const placeDormItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ slotId: z.string().min(1), itemId: z.string().uuid().nullable() })
      .parse(d),
  )
  .handler(async ({ data, context }) => setDormSlot(context.userId, data.slotId, data.itemId));
