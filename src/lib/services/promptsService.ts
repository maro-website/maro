"use client";

import { getAccessToken } from "@/lib/supabase/client";
import { InsufficientCreditsError } from "@/lib/services/generationService";
import type { AdminPromptItem, PromptAnalytics, PromptItem } from "@/lib/prompts/types";

export { InsufficientCreditsError };

// ---- User-facing ----

export async function fetchPrompts(): Promise<{
  items: PromptItem[];
  liked: string[];
  owned: string[];
}> {
  const token = await getAccessToken();
  const res = await fetch("/api/prompts", {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return { items: [], liked: [], owned: [] };
  const j = (await res.json().catch(() => ({}))) as {
    items?: PromptItem[];
    liked?: string[];
    owned?: string[];
  };
  return { items: j.items ?? [], liked: j.liked ?? [], owned: j.owned ?? [] };
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

// Reveal-and-copy: costs credits once, then unlocked forever. Throws
// InsufficientCreditsError (402) so the UI can open the buy-credits modal.
export async function revealPrompt(
  promptId: string
): Promise<{ fullPrompt: string; alreadyOwned: boolean; creditsSpent: number }> {
  const token = await getAccessToken();
  const res = await fetch("/api/prompts/reveal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ promptId }),
  });
  if (res.status === 402) {
    const j = await res.json().catch(() => ({}));
    throw new InsufficientCreditsError(j.needed ?? 0, j.have ?? 0);
  }
  if (!res.ok) throw new Error(`reveal-failed-${res.status}`);
  return (await res.json()) as { fullPrompt: string; alreadyOwned: boolean; creditsSpent: number };
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
  category: string;
  featured_url: string | null;
  full_prompt: string;
  keywords: string[];
  target_tool: string;
  active: boolean;
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
  const res = await fetch("/api/admin/ad-upload", {
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
