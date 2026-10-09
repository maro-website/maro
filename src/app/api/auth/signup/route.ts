import { sanitizeInternalRedirectPath } from "@/lib/auth/safeRedirect";
import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { isSignupEnabled, MIN_PASSWORD_LENGTH } from "@/lib/config/features";
import { isDisposableEmail } from "@/lib/security/disposableEmails";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";
import { createSupabaseRouteHandlerClient, supabaseRouteHandlerConfigured } from "@/lib/supabase/routeHandler";
import { buildPublicUrl } from "@/lib/config/appOrigin";
import { authFailure, authJson, CONFIRMATION_NOTICE, readPublicAuthRequest } from "@/lib/auth/publicAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSignupEnabled()) return authJson({ error: "signup_disabled" }, 403);
  if (!supabaseServerConfigured() || !supabaseRouteHandlerConfigured()) return authJson({ error: "auth_temporarily_unavailable" }, 503);
  try {
    const input = await readPublicAuthRequest(req, "signup");
    if (input.response) return input.response;
    const { body, email, ip } = input;
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
    if (password.length < MIN_PASSWORD_LENGTH || password.length > 256) return authJson({ error: "weak-password" }, 400);
    if (isDisposableEmail(email)) return authJson({ error: "disposable-email" }, 400);
    const destination = sanitizeInternalRedirectPath(typeof body.next === "string" ? body.next : null, "/");
    const signInPath = destination === "/" ? "/sign-in?confirmed=1" : `/sign-in?confirmed=1&next=${encodeURIComponent(destination)}`;
    const response = authJson(CONFIRMATION_NOTICE);
    const supabase = createSupabaseRouteHandlerClient(req, response);
    const { data, error } = await supabase.auth.signUp({ email, password, options: {
      data: { full_name: name || email.split("@")[0] },
      emailRedirectTo: buildPublicUrl("/auth/callback", { type: "signup", next: signInPath }),
    } });
    const failure = authFailure(error);
    if (failure) return failure;
    if (data.session) {
      // Confirmation must be enabled; never expose an auto-confirmed session.
      await supabase.auth.signOut({ scope: "local" });
      return authJson({ error: "auth_temporarily_unavailable" }, 503);
    }
    // Confirmed duplicates return an obfuscated identity: never write a signal for it.
    if (!error && data.user?.id && data.user.identities?.length) {
      await getSupabaseAdmin().from("signup_signals").insert({ user_id: data.user.id, ip,
        user_agent_hash: createHash("sha256").update(req.headers.get("user-agent") ?? "").digest("hex").slice(0, 32) });
    }
    return response;
  } catch { return authJson({ error: "auth_temporarily_unavailable" }, 503); }
}
