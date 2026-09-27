"use client";

import { getAccessToken } from "@/lib/supabase/client";
import type { AdminPromptItem, PresetCategoryItem, PromptAnalytics, PromptDetail, PromptItem } from "@/lib/prompts/types";
import type { PresetConfig, PresetTool } from "@/lib/presets/model";

// ---- User-facing ----

export async function fetchPrompts(input: {
  tool?: PresetTool;
  category?: string;
  query?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{
  items: PromptItem[];
  liked: string[];
  categories: PresetCategoryItem[];
  hasMore: boolean;
}> {
  const token = await getAccessToken();
  const params = new URLSearchParams({
    tool: input.tool ?? "imazh",
    page: String(input.page ?? 0),
    limit: String(input.limit ?? 36),
  });
  if (input.category) params.set("category", input.category);
  if (input.query) params.set("q", input.query);
  const res = await fetch(`/api/prompts?${params}`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return { items: [], liked: [], categories: [], hasMore: false };
  const j = (await res.json().catch(() => ({}))) as {
    items?: PromptItem[];
    liked?: string[];
    categories?: PresetCategoryItem[];
    hasMore?: boolean;
  };
  return { items: j.items ?? [], liked: j.liked ?? [], categories: j.categories ?? [], hasMore: Boolean(j.hasMore) };
}

export async function fetchPromptDetail(id: string): Promise<PromptDetail> {
  const res = await fetch(`/api/prompts/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`preset-detail-${res.status}`);
  return ((await res.json()) as { item: PromptDetail }).item;
}

export async function toggleLike(promptId: string, liked: boolean): Promise<void> {
  const token = await getAccessToken();
  await fetch("/api/prompts/like", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ promptId, liked }),
  });
}

// ---- Admin ----

export async function adminListPrompts(): Promise<{
  items: AdminPromptItem[];
  analytics: PromptAnalytics | null;
}> {
  const token = await getAccessToken();
  const res = await fetch("/api/admin/prompts", {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return { items: [], analytics: null };
  const j = (await res.json().catch(() => ({}))) as {
    items?: AdminPromptItem[];
    analytics?: PromptAnalytics;
  };
  return { items: j.items ?? [], analytics: j.analytics ?? null };
}

export interface PromptDraft {
  tool: PresetTool;
  title: string;
  slug?: string;
  description: string;
  category: string;
  featured_url: string | null;
  full_prompt: string;
  keywords: string[];
  target_tool: string;
  active: boolean;
  status: AdminPromptItem["status"];
  config: PresetConfig;
  featured: boolean;
  sort_order: number;
  access_level: "free" | "premium";
}

export async function adminCreatePrompt(draft: PromptDraft): Promise<AdminPromptItem> {
  const token = await getAccessToken();
  const res = await fetch("/api/admin/prompts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(draft),
  });
  if (!res.ok) throw new Error(`create-failed-${res.status}`);
  return ((await res.json()) as { item: AdminPromptItem }).item;
}

export async function adminUpdatePrompt(
  id: string,
  patch: Partial<PromptDraft>
): Promise<AdminPromptItem> {
  const token = await getAccessToken();
  const res = await fetch("/api/admin/prompts", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ id, ...patch }),
  });
  if (!res.ok) throw new Error(`update-failed-${res.status}`);
  return ((await res.json()) as { item: AdminPromptItem }).item;
}

export async function adminDeletePrompt(id: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch("/api/admin/prompts", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(`delete-failed-${res.status}`);
}

// Upload a featured image (data URL) via the existing admin upload endpoint.
export async function adminUploadPromptImage(dataUrl: string): Promise<string> {
  const token = await getAccessToken();
  const res = await fetch("/api/admin/presets/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ dataUrl }),
  });
  if (!res.ok) throw new Error(`upload-failed-${res.status}`);
  return ((await res.json()) as { url: string }).url;
}
