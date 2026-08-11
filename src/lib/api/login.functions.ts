import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const LoginSchema = z.object({
  identifier: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(128),
});

export type LoginResult =
  | { ok: true; access_token: string; refresh_token: string }
  | { ok: false; code: "not_found" | "invalid" | "inactive" };

/**
 * Resolves an Academy ID (username) or email to the underlying auth identity and
 * signs in. The email mapping never leaves the server.
 */
export const loginWithAcademyId = createServerFn({ method: "POST" })
  .inputValidator((d) => LoginSchema.parse(d))
  .handler(async ({ data }): Promise<LoginResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const identifier = data.identifier.trim();

    let email: string | null = null;
    let profileId: string | null = null;
    let isActive = true;

    if (identifier.includes("@")) {
      email = identifier.toLowerCase();
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("id, is_active")
        .ilike("email", email)
        .maybeSingle();
      if (p) {
        profileId = p.id;
        isActive = p.is_active !== false;
      }
    } else {
      const { data: rows } = await supabaseAdmin
        .from("profiles")
        .select("id, email, is_active, username")
        .ilike("username", identifier)
        .limit(2);
      const match = (rows ?? []).find(
        (r) => (r.username ?? "").trim().toLowerCase() === identifier.toLowerCase(),
      );
      if (!match) return { ok: false, code: "not_found" };
      email = match.email;
      profileId = match.id;
      isActive = match.is_active !== false;
    }

    if (!email) return { ok: false, code: "not_found" };
    if (profileId && !isActive) return { ok: false, code: "inactive" };

    const client = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { data: signIn, error } = await client.auth.signInWithPassword({
      email,
      password: data.password,
    });

    if (error || !signIn.session) {
      const msg = (error?.message ?? "").toLowerCase();
      if (msg.includes("banned") || msg.includes("disabled")) return { ok: false, code: "inactive" };
      return { ok: false, code: "invalid" };
    }

    // Re-check activation against the freshly authenticated user id.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_active")
      .eq("id", signIn.session.user.id)
      .maybeSingle();
    if (profile && profile.is_active === false) {
      return { ok: false, code: "inactive" };
    }

    return {
      ok: true,
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    };
  });
