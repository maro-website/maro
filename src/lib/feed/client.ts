import { getAccessToken } from "@/lib/supabase/client";
import type { FeedView } from "./model";
export const feedMessages: Record<string, string> = {
  unauthorized: "Hyr përsëri në llogari për t’i krijuar imazhet.",
  marketing_unavailable: "Imazhi u ruajt, por nuk u shtua në plan. Provo përsëri; progresi ruhet.",
  campaign_conflict: "Plani ndryshoi në një tab tjetër. Rifreskoje faqen; imazhet ruhen.",
  invalid_asset: "Një foto nuk u hap. Ngarkoje përsëri dhe provo me foton e re.",
  brain_too_large: "Brain-i nuk u përgatit për gjenerim. Rifreskoje faqen dhe provo përsëri.",
  invalid_request: "Të dhënat e imazheve nuk u pranuan. Kontrollo fotot e zgjedhura dhe provo përsëri.",
  feed_unavailable: "Shërbimi i imazheve nuk u hap. Rifreskoje faqen dhe provo përsëri.",
  campaign_not_ready: "Prit derisa plani të përfundojë para se t’i krijosh imazhet.",
  campaign_not_found: "Kjo fushatë nuk i përket Brain-it aktiv. Zgjedhe fushatën e duhur.",
  feed_cancelled: "Feed-i është ndalur. Mund t’i shkarkosh imazhet e përfunduara.",
  too_many_references: "Mund të ngarkosh deri në 10 referenca.",
  insufficient_credits: "Nuk ke mjaft credits për këtë veprim.", brief_incomplete: "Shkruaje emrin e brendit dhe një përshkrim me së paku 8 shkronja.",
  brain_incomplete: "Plotëso emrin dhe përshkrimin e brendit në maroBrain, ose përdore mini-formularin.", brain_empty: "Ky workspace ende nuk ka të dhëna në maroBrain.",
  brain_plan_required: "maroBrain kërkon plan aktiv. Mundesh me vazhdu me mini-formularin.", feed_busy: "Një postim po gjenerohet. Prit derisa të përfundojë.",
  generation_failed: "Ky postim nuk u përfundua. Provo përsëri; rigjenerimi i dështuar nuk harxhon credits ose tentimet falas.",
  recovery_pending: "Po verifikohet rezultati. Progresi ruhet; hape përsëri feed-in pas pak.", retry_limit: "Ky postim ka arritur kufirin e tentimeve. Kontakto suportin.",
  feed_paused: "maroFeed është ndalur përkohësisht.", storage_quota_exceeded: "Hapësira e llogarisë është mbushur. Liro hapësirë për imazhet e reja.",
  feed_not_available: "maroFeed është në pilot privat.", rate_limited: "Prit pak para veprimit tjetër.", config_conflict: "Konfigurimi u ndryshua në një tab tjetër. Rifreskoje faqen.",
};
export const feedMessage = (code: string) => feedMessages[code] ?? "Veprimi nuk u përfundua. Provo përsëri pas pak.";
export async function feedFetch(path: string, body?: unknown, method = "POST") {
  const token = await getAccessToken();
  if (!token) throw new Error("unauthorized");
  return fetch(path, { method: body === undefined ? "GET" : method, headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: "no-store" });
}
export async function feedJson<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const response = await feedFetch(path, body, method); const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error ?? "feed_unavailable");
  return data as T;
}
export async function feedStep(body: unknown, studio: "feed" | "apps" = "feed"): Promise<{ feed?: FeedView; error?: string }> {
  const response = await feedFetch(`/api/${studio}/action`, body);
  if (!response.headers.get("content-type")?.includes("text/event-stream")) {
    const data = await response.json(); if (!response.ok || data.error) throw new Error(data.error ?? "feed_unavailable"); return data;
  }
  const reader = response.body?.getReader(); if (!reader) throw new Error("feed_unavailable");
  const decoder = new TextDecoder(); let buffer = ""; let result: { feed?: FeedView; error?: string } | undefined;
  for (;;) {
    const chunk = await reader.read(); buffer += decoder.decode(chunk.value, { stream: !chunk.done });
    let end: number;
    while ((end = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2);
      if (frame.startsWith("data: ")) { const value = JSON.parse(frame.slice(6)); if (value.feed || value.error) result = value; }
    }
    if (chunk.done) break;
  }
  if (!result) throw new Error("recovery_pending");
  return result;
}
export async function downloadFeed(id: string, slot?: number, studio: "feed" | "apps" = "feed") {
  const response = await feedFetch(`/api/${studio}/download?feedId=${encodeURIComponent(id)}${slot === undefined ? "" : `&slot=${slot}`}`);
  if (!response.ok) { const data = await response.json(); throw new Error(data.error ?? "download_failed"); }
  const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a");
  const name = studio === "apps" ? "maroApps" : "maroFeed";
  link.href = url; link.download = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? (slot === undefined ? `${name}-posts.zip` : `${name}-${String(slot + 1).padStart(2, "0")}.png`);
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
