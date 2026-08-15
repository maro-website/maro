"use client";

import type { ContestItem, ContestSubmission } from "@/lib/contests/types";

export async function fetchContests(): Promise<ContestItem[]> {
  const res = await fetch("/api/contests", { cache: "no-store" });
  if (!res.ok) return [];
  const j = (await res.json()) as { items?: ContestItem[] };
  return j.items ?? [];
}

export async function fetchContest(slug: string): Promise<ContestItem | null> {
  const res = await fetch(`/api/contests?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (!res.ok) return null;
  const j = (await res.json()) as { item?: ContestItem };
  return j.item ?? null;
}

export async function fetchContestSubmissions(contestId: string): Promise<ContestSubmission[]> {
  const res = await fetch(`/api/contests?submissions=${encodeURIComponent(contestId)}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const j = (await res.json()) as { items?: ContestSubmission[] };
  return j.items ?? [];
}

export async function submitToContest(input: {
  contestId: string;
  url: string;
  prompt: string;
}): Promise<boolean> {
  const { getAccessToken } = await import("@/lib/supabase/client");
  const token = await getAccessToken();
  const res = await fetch("/api/contests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });
  return res.ok;
}
