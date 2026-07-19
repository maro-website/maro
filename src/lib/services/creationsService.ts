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

// Persist a favourite/title change server-side (keyed by first image URL).
export async function updateMyCreation(
  url: string | undefined,
  patch: { favourite?: boolean; title?: string }
): Promise<void> {
  if (!url || url.startsWith("data:")) return;
  try {
    const token = await getAccessToken();
    if (!token) return;
    await fetch("/api/creations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url, ...patch }),
    });
  } catch {
    /* best-effort */
  }
}

// Delete a creation server-side so it doesn't re-appear after a re-sync.
export async function deleteMyCreation(url: string | undefined): Promise<void> {
  if (!url || url.startsWith("data:")) return;
  try {
    const token = await getAccessToken();
    if (!token) return;
    await fetch("/api/creations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url }),
    });
  } catch {
    /* best-effort */
  }
}
