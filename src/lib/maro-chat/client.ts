import { getAccessToken } from "@/lib/supabase/client";
export const chatErrors: Record<string, string> = {
  chat_key_missing: "maroChat po lidhet me OpenAI. Provo përsëri pak më vonë.", chat_forbidden: "Ky pilot është vetëm për erzen@nice.al.",
  chat_monthly_limit: "E ke përdorur kuotën e chat-it për këtë muaj. Rinovohet më 1 të muajit të ardhshëm.",
  chat_daily_limit: "Për sot e arritëm kufirin e chat-it. Mund të vazhdosh nesër.", chat_busy: "Një përgjigje është ende duke u përgatitur. Prit pak dhe rifresko bisedën.",
  brand_conflict: "Brain ka ndryshuar ndërkohë. Kërko një propozim të ri që t’i ruajmë ndryshimet e fundit.", brain_plan_required: "Ky Brain kërkon plan aktiv maroStandard ose maroPro.",
  rate_limited: "Shumë kërkesa për momentin. Prit pak dhe provo përsëri.", unauthorized: "Sesioni ka skaduar. Hyr përsëri.",
};
export async function chatRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken(); if (!token) throw new Error(chatErrors.unauthorized);
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers }, cache: "no-store", signal: init.signal ?? AbortSignal.timeout(85_000) });
  const payload = await response.json();
  if (!response.ok) throw new Error(chatErrors[payload.error] ?? "maroChat nuk u përgjigj. Rifresko bisedën para se të provosh përsëri.");
  return payload as T;
}
