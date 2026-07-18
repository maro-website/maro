"use client";

import { getAccessToken } from "@/lib/supabase/client";

export type TrackKind = "view" | "copy";

// Best-effort analytics for prompt views/copies. Never throws.
export async function trackEvent(input: {
  kind: TrackKind;
  toolId: string;
  prompt: string;
  url?: string;
}): Promise<void> {
  try {
    const token = await getAccessToken();
    await fetch("/api/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(input),
      keepalive: true,
    });
  } catch {
    /* analytics is best-effort */
  }
}
