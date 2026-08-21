"use client";

import { getAccessToken } from "@/lib/supabase/client";
import type { ImageCreation } from "@/lib/types";

// Fetch the signed-in user's image generations from the server. A null result
// means the request failed; [] is a successful empty server source of truth.
export async function fetchMyCreations(): Promise<ImageCreation[] | null> {
  try {
    const token = await getAccessToken();
    if (!token) return null;
    const res = await fetch("/api/creations", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j = (await res.json().catch(() => ({}))) as { items?: ImageCreation[] };
    return Array.isArray(j.items) ? j.items : [];
  } catch {
    return null;
  }
}

// Persist a favourite/title change server-side (keyed by first image URL).
export async function updateMyCreation(
  url: string | undefined,
  patch: { favourite?: boolean; title?: string },
  id?: string
): Promise<void> {
  if (!id && (!url || url.startsWith("data:"))) return;
  try {
    const token = await getAccessToken();
    if (!token) return;
    await fetch("/api/creations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, url, ...patch }),
    });
  } catch {
    /* best-effort */
  }
}

// Delete a creation server-side so it doesn't re-appear after a re-sync.
export async function deleteMyCreation(url: string | undefined, id?: string): Promise<void> {
  if (!id && (!url || url.startsWith("data:"))) return;
  try {
    const token = await getAccessToken();
    if (!token) return;
    await fetch("/api/creations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, url }),
    });
  } catch {
    /* best-effort */
  }
}
