"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// True only when both public env vars are present. The app degrades gracefully
// (auth UI shows a "not configured" note) when Supabase isn't set up yet.
export const supabaseConfigured = Boolean(url && anonKey);

let cached: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (!supabaseConfigured) {
    throw new Error(
      "Supabase nuk është konfiguruar. Vendos NEXT_PUBLIC_SUPABASE_URL dhe NEXT_PUBLIC_SUPABASE_ANON_KEY te .env.local."
    );
  }
  if (!cached) cached = createBrowserClient(url as string, anonKey as string);
  return cached;
}

// Read the current access token (JWT) for authenticated API calls. Returns null
// when Supabase isn't configured or there is no active session.
export async function getAccessToken(): Promise<string | null> {
  if (!supabaseConfigured) return null;
  const { data } = await getSupabaseBrowser().auth.getSession();
  return data.session?.access_token ?? null;
}
