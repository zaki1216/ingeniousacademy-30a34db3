import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { AcademyRank } from "@/lib/rpg/academyRanks";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles").select("user_id")
    .eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden");
}

/** Public: list all enabled ranks (used by students & world). */
export const listAcademyRanks = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const supabase = createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await supabase
    .from("academy_ranks")
    .select("*")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AcademyRank[];
});

/** Admin: list ALL ranks including disabled ones. */
export const adminListAcademyRanks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("academy_ranks").select("*").order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as AcademyRank[];
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1).max(48),
  name: z.string().min(1).max(80),
  icon: z.string().min(1).max(48),
  color: z.string().min(1).max(48),
  gradient: z.string().min(1).max(240),
  xp_required: z.number().int().min(0),
  message: z.string().max(240).nullable().optional(),
  sort_order: z.number().int().min(0),
  enabled: z.boolean(),
});

export const adminUpsertAcademyRank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = { ...data, message: data.message ?? null };
    if (data.id) {
      const { error } = await supabaseAdmin.from("academy_ranks").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin.from("academy_ranks").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const adminDeleteAcademyRank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("academy_ranks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
