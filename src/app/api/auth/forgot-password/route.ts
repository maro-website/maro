import type { NextRequest } from "next/server";
import { buildPublicUrl } from "@/lib/config/appOrigin";
import { createSupabaseRouteHandlerClient, supabaseRouteHandlerConfigured } from "@/lib/supabase/routeHandler";
import { authFailure, authJson, readPublicAuthRequest, RECOVERY_NOTICE } from "@/lib/auth/publicAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  if (!supabaseRouteHandlerConfigured()) return authJson({ error: "auth_temporarily_unavailable" }, 503);
  try {
    const input = await readPublicAuthRequest(req, "forgot-password");
    if (input.response) return input.response;
    const response = authJson(RECOVERY_NOTICE);
    // Return the response carrying the browser's PKCE verifier cookie.
    const supabase = createSupabaseRouteHandlerClient(req, response);
    const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
      redirectTo: buildPublicUrl("/auth/callback", { type: "recovery", next: "/reset-password" }),
    });
    return authFailure(error) ?? response;
  } catch { return authJson({ error: "auth_temporarily_unavailable" }, 503); }
}
