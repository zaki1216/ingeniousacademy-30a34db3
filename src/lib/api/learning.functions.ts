import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { claimMission, computeContinueLearning, computeMissionState } from "@/lib/learning/engine.server";

export const getContinueLearning = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => computeContinueLearning(context.userId));

export const getDailyMissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => computeMissionState(context.userId));

export const claimMissionReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ code: z.enum(["watch_lessons", "earn_xp", "clear_chapter", "keep_streak"]) })
      .parse(d),
  )
  .handler(async ({ data, context }) => claimMission(context.userId, data.code));
