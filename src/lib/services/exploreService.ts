"use client";

import { getAccessToken } from "@/lib/supabase/client";

export interface ExploreItem {
  id: string;
  tool_id: string;
  prompt: string;
  url: string;
  author: string | null;
  author_avatar?: string | null;
  created_at: string;
}

// Publish a generated image to the public Explore feed.
export async function shareToExplore(input: {
  toolId: string;
  prompt: string;
  url: string;
}): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch("/api/explore", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`share-failed-${res.status}`);
}

// Read the public Explore feed (no auth required).
export async function fetchExplore(): Promise<ExploreItem[]> {
  const res = await fetch("/api/explore", { cache: "no-store" });
  if (!res.ok) return [];
  const j = (await res.json().catch(() => ({}))) as { items?: ExploreItem[] };
  return j.items ?? [];
}
