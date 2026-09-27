import type { NextRequest } from "next/server";
import { buildPublicUrl } from "@/lib/config/appOrigin";
import { createSupabaseRouteHandlerClient, supabaseRouteHandlerConfigured } from "@/lib/supabase/routeHandler";
import { authFailure, authJson, CONFIRMATION_NOTICE, readPublicAuthRequest } from "@/lib/auth/publicAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  if (!supabaseRouteHandlerConfigured()) return authJson({ error: "auth_temporarily_unavailable" }, 503);
  try {
    const input = await readPublicAuthRequest(req, "resend");
    if (input.response) return input.response;
    const response = authJson(CONFIRMATION_NOTICE);
    const supabase = createSupabaseRouteHandlerClient(req, response);
    const { error } = await supabase.auth.resend({ type: "signup", email: input.email,
      options: { emailRedirectTo: buildPublicUrl("/auth/callback", { type: "signup", next: "/sign-in?confirmed=1" }) } });
    return authFailure(error) ?? response;
  } catch { return authJson({ error: "auth_temporarily_unavailable" }, 503); }
}
