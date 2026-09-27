"use client";

import { getAccessToken } from "@/lib/supabase/client";
import type { ExploreItemExtended, ExploreSort } from "@/lib/explore/types";

export type { ExploreItem } from "@/lib/services/exploreService";

export async function fetchExploreFeed(sort: ExploreSort = "recent"): Promise<ExploreItemExtended[]> {
  const token = await getAccessToken();
  const res = await fetch(`/api/explore?sort=${sort}`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return [];
  const j = (await res.json()) as { items?: ExploreItemExtended[] };
  return j.items ?? [];
}

export async function shareToExplore(input: {
  toolId: string;
  prompt: string;
  url: string;
  selections?: Record<string, string>;
  presetId?: string;
  remixOf?: string;
}): Promise<{ slug?: string }> {
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
  return (await res.json()) as { slug?: string };
}

export async function toggleCreationLike(creationId: string, liked: boolean): Promise<number> {
  const token = await getAccessToken();
  const res = await fetch("/api/explore/like", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ creationId, liked }),
  });
  if (!res.ok) return 0;
  const j = (await res.json()) as { like_count?: number };
  return j.like_count ?? 0;
}

export async function fetchCreationBySlug(slug: string): Promise<ExploreItemExtended | null> {
  const res = await fetch(`/api/explore?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (!res.ok) return null;
  const j = (await res.json()) as { item?: ExploreItemExtended };
  return j.item ?? null;
}

export async function remixCreation(item: ExploreItemExtended): Promise<void> {
  sessionStorage.setItem(
    "maro:remix",
    JSON.stringify({
      prompt: item.prompt,
      toolId: item.tool_id,
      remixOf: item.id,
    })
  );
  const route =
    item.tool_id === "logo"
      ? "/marologo"
      : item.tool_id === "website"
      ? "/web"
      : "/imazh";
  window.location.href = route;
}

export async function toggleFollow(creatorId: string, follow: boolean): Promise<boolean> {
  const token = await getAccessToken();
  const res = await fetch("/api/follow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ creatorId, follow }),
  });
  return res.ok;
}

export async function fetchActiveChallenge() {
  const res = await fetch("/api/challenges", { cache: "no-store" });
  if (!res.ok) return null;
  const j = (await res.json()) as { challenge?: import("@/lib/explore/types").ChallengeItem };
  return j.challenge ?? null;
}
