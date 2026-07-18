"use client";

import { getAccessToken } from "@/lib/supabase/client";

export interface UsageItem {
  id: string;
  toolId: string | null;
  kind: string;
  prompt: string;
  credits: number;
  createdAt: string;
}

export interface UsageResult {
  items: UsageItem[];
  totalCount: number;
  totalCredits: number;
}

export async function fetchUsage(): Promise<UsageResult> {
  const empty: UsageResult = { items: [], totalCount: 0, totalCredits: 0 };
  try {
    const token = await getAccessToken();
    if (!token) return empty;
    const res = await fetch("/api/usage", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return empty;
    return (await res.json()) as UsageResult;
  } catch {
    return empty;
  }
}
