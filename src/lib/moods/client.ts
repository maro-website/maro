"use client";
import { getAccessToken } from "@/lib/supabase/client";
import { rateLimitedFetch } from "@/lib/client/rateLimit";

export const MOODS_CHANGED = "maro:moods-changed";
const errors: Record<string, string> = {
  mood_changed: "Stili është ndryshuar ndërkohë. Rifresko dhe provo përsëri.",
  invalid_style: "Kontrollo titullin (deri në 40 karaktere) dhe përshkrimin (10–1600 karaktere).",
  invalid_style_cover: "Zgjedh një thumbnail PNG, JPG ose WebP deri në 5 MB.",
  style_content_rejected: "Përmbajtja nuk e kaloi kontrollin. Ndrysho thumbnail-in ose përshkrimin dhe provo përsëri.",
  style_rate_limited: "E ke arritur kufirin ditor. Provo përsëri nesër.",
  styles_ai_unavailable: "Përgatitja e stilit nuk është e disponueshme. Provo përsëri më vonë.",
  invalid_style_review: "Shkruaj arsyen e refuzimit, deri në 500 karaktere.",
};
export async function moodRequest<T>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error("Hyr në llogari për të vazhduar.");
  const response = await rateLimitedFetch(path, { method: options.method, signal: options.signal,
    headers: { Authorization: `Bearer ${token}`, ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}) },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}), cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(errors[result.error] ?? (response.status === 403 ? "maroStyles nuk është i disponueshëm për këtë llogari." : "Veprimi nuk u përfundua. Provo përsëri."));
  return result as T;
}
export function notifyMoodsChanged() { window.dispatchEvent(new Event(MOODS_CHANGED)); }
