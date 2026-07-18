"use client";

import { getAccessToken } from "@/lib/supabase/client";
import type { ImageCreation } from "@/lib/types";

// Fetch the signed-in user's image generations from the server. Best-effort:
// returns [] on any failure so the UI keeps working from local cache.
export async function fetchMyCreations(): Promise<ImageCreation[]> {
  try {
    const token = await getAccessToken();
    if (!token) return [];
    const res = await fetch("/api/creations", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const j = (await res.json().catch(() => ({}))) as { items?: ImageCreation[] };
    return j.items ?? [];
  } catch {
    return [];
  }
}
