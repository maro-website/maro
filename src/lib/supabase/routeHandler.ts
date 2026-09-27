import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function supabaseRouteHandlerConfigured(): boolean {
  return Boolean(url && anonKey);
}

/**
 * Supabase SSR client for Route Handlers — writes session cookies onto the
 * supplied NextResponse (required for verifyOtp / exchangeCodeForSession).
 */
export function createSupabaseRouteHandlerClient(
  request: NextRequest,
  response: NextResponse
) {
  if (!url || !anonKey) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}
