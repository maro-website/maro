"use client";

import { getAccessToken } from "@/lib/supabase/client";
import type { ImageCreation } from "@/lib/types";
import type { ConversationJob } from "@/lib/creations/conversations";

// Fetch the signed-in user's image generations from the server. A null result
// means the request failed; [] is a successful empty server source of truth.
export async function fetchMyCreations(conversation?: string): Promise<ImageCreation[] | null> {
  return (await fetchConversationHistory(conversation))?.items ?? null;
}

export async function fetchConversationHistory(conversation?: string): Promise<{ items: ImageCreation[]; jobs: ConversationJob[] } | null> {
  try {
    const token = await getAccessToken();
    if (!token) return null;
    let offset: number | null = 0;
    const items: ImageCreation[] = [];
    let jobs: ConversationJob[] = [];
    do {
    const params = new URLSearchParams();
    if (conversation) params.set("conversation", conversation);
    if (offset) params.set("offset", String(offset));
    const res = await fetch(`/api/creations${params.size ? `?${params}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { items?: ImageCreation[]; nextOffset?: number | null; jobs?: ConversationJob[] };
    items.push(...(Array.isArray(j.items) ? j.items : []));
    if (Array.isArray(j.jobs)) jobs = j.jobs;
    offset = conversation && typeof j.nextOffset === "number" && j.nextOffset > (offset ?? 0) ? j.nextOffset : null;
    } while (offset !== null);
    return { items, jobs };
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

/** Unlike deleting a whole chat result, this only removes the chosen output files. */
export async function deleteMyCreationAssets(assetRefs: string[], url: string | undefined, id?: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error("unauthorized");
  const response = await fetch("/api/creations", {
    method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ id, url, assetRefs }),
  });
  if (!response.ok) throw new Error("asset-delete-failed");
  const result: { ok?: boolean } = await response.json();
  if (!result.ok) throw new Error("asset-delete-failed");
}
