import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  equipAcademyTitle,
  getCertificate,
  syncAndGetLegacy,
  loadSettings,
} from "@/lib/legacy/engine.server";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

/** Student: permanent Academy Legacy (syncs new milestones, then returns all). */
export const getAcademyLegacy = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => syncAndGetLegacy(context.userId));

export const equipTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().min(1).nullable() }).parse(d))
  .handler(async ({ data, context }) => equipAcademyTitle(context.userId, data.code));

export const getMyCertificate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => getCertificate(context.userId, data.id));

/* -------------------------- Admin: Legacy Manager -------------------------- */

export const adminGetLegacySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [settings, titlesRes, certsRes] = await Promise.all([
      loadSettings(),
      supabaseAdmin
        .from("titles")
        .select("code, name, description, icon, rarity, requirement_type, requirement_value, enabled, sort_order")
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("certificates")
        .select("id, subject_name, student_name, username, serial, issued_at")
        .order("issued_at", { ascending: false })
        .limit(100),
    ]);
    return {
      settings,
      titles: titlesRes.data ?? [],
      certificates: certsRes.data ?? [],
    };
  });

const settingsSchema = z.object({
  headmaster_name: z.string().min(1).max(120),
  headmaster_signature: z.string().min(1).max(120),
  seal_text: z.string().min(1).max(120),
  graduation_threshold: z.number().int().min(1).max(100),
  celebrations_enabled: z.boolean(),
  ceremony_enabled: z.boolean(),
  certificate_note: z.string().max(400),
  hall_categories: z.array(z.string().min(1)).min(1),
});

export const adminUpdateLegacySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("legacy_settings")
      .upsert({ id: true, ...data }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const titleSchema = z.object({
  code: z.string().min(1).max(48),
  name: z.string().min(1).max(80),
  description: z.string().max(240).nullable().optional(),
  icon: z.string().min(1).max(16),
  rarity: z.enum(["common", "rare", "epic", "legendary"]),
  requirement_type: z.enum(["lessons", "dungeons", "master_trials", "graduations", "xp", "level"]),
  requirement_value: z.number().int().min(1),
  enabled: z.boolean(),
  sort_order: z.number().int().min(0),
});

export const adminUpsertTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => titleSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("titles")
      .upsert({ ...data, description: data.description ?? null }, { onConflict: "code" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_titles").delete().eq("title_code", data.code);
    const { error } = await supabaseAdmin.from("titles").delete().eq("code", data.code);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
