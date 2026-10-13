"use client";
import { getAccessToken } from "@/lib/supabase/client";
import { rateLimitedFetch } from "@/lib/client/rateLimit";

export const MOODS_CHANGED = "maro:moods-changed";
export async function moodRequest<T>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error("Hyr në llogari për të vazhduar.");
  const response = await rateLimitedFetch(path, { method: options.method, signal: options.signal,
    headers: { Authorization: `Bearer ${token}`, ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}) },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}), cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error === "mood_changed" ? "Mood-i është ndryshuar. Rifresko dhe provo përsëri." : response.status === 403 ? "maroMood nuk është i disponueshëm për këtë llogari." : "Veprimi nuk u përfundua. Provo përsëri.");
  return result as T;
}
export function notifyMoodsChanged() { window.dispatchEvent(new Event(MOODS_CHANGED)); }
