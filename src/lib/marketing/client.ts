import { getAccessToken } from "@/lib/supabase/client";
export const marketingMessages: Record<string, string> = {
  unauthorized: "Hyr në llogarinë tënde.", marketing_forbidden: "maroMarketing është në pilot privat.",
  marketing_key_missing: "API i marketingut ende nuk është aktiv. Provo pas konfigurimit.",
  marketing_busy: "Një fushatë po përgatitet. Prit pak dhe rifresko historikun.",
  marketing_daily_limit: "U arrit kufiri ditor i pilotit ($2).", marketing_monthly_limit: "U arrit kufiri mujor i pilotit ($10).",
  brain_incomplete: "Plotëso emrin dhe përshkrimin e brendit te maroBrain.", brain_plan_required: "Ky Brain kërkon plan aktiv.",
  campaign_conflict: "Fushata ka ndryshuar. Rifreskoje para ruajtjes.", invalid_start_date: "Zgjedhe një datë nga sot deri një vit përpara.",
  research_unverified: "Hulumtimi nuk ktheu burime të verifikueshme. Provo përsëri ose çaktivizo hulumtimin live.",
  generation_incomplete: "Plani nuk u përfundua. Progresi dhe përdorimi janë ruajtur në historik.",
  social_key_missing: "Lidhja me socials ende nuk është konfiguruar.", social_payment_required: "Zernio kërkon konfigurim pagese për këtë veprim. X ka pagesë sipas përdorimit.",
  social_access_required: "Kontrollo API-në ose rilidhe llogarinë sociale.", social_rate_limited: "Rrjeti ka kërkuar të presim. Provo më vonë.",
  social_provider_failed: "Rrjeti nuk e përfundoi kërkesën. Kontrollo lidhjen dhe historikun para një veprimi tjetër.",
  social_account_mismatch: "Zgjedhe një llogari aktive të rrjetit të këtij postimi.", social_account_not_found: "Kjo llogari nuk është e lidhur me këtë Brain.",
  social_caption_too_long: "Teksti është tepër i gjatë për këtë rrjet. Shkurto hook-un, përshkrimin ose CTA-në dhe miratoje përsëri.",
  social_format_required: "Ky kanal kërkon format tjetër. Këtu përgatiten imazhe; videon përfundoje në kanalin përkatës.",
  social_platform_restricted: "Ky rrjet ka kufizime nga ofruesi. Shiko shpjegimin te Socials.",
  post_review_required: "Shto imazhin dhe mirato përmbajtjen para publikimit.", invalid_schedule: "Orari duhet të jetë së paku 5 minuta përpara dhe brenda 60 ditëve.",
  publication_already_started: "Kërkesa e këtij postimi është nisur. Kontrollo historikun.",
  publication_status_unknown: "Statusi ende nuk është konfirmuar. Kontrolloje në Zernio para çdo ripublikimi.",
  publication_not_scheduled: "Ky postim nuk është më në pritje të orarit. Rifresko statusin.",
  social_has_pending_posts: "Anulo ose përfundo postimet në pritje para shkëputjes.",
  tiktok_review_required: "Rishiko cilësimet aktuale të TikTok. Imazhet AI përfundohen në aplikacionin TikTok.",
  images_not_ready: "Ende nuk ka imazhe të përfunduara për import.", invalid_request: "Kontrolloji fushat dhe provo përsëri.",
};
export const marketingMessage = (code: string) => marketingMessages[code] ?? "Veprimi nuk u përfundua. Rifresko historikun dhe provo përsëri.";
export async function marketingJson<T>(path: string, body?: unknown): Promise<T> {
  const token = await getAccessToken(); if (!token) throw new Error("unauthorized");
  const response = await fetch(path, { method: body === undefined ? "GET" : "POST", cache: "no-store", headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json(); if (!response.ok || data.error) throw new Error(data.error || "marketing_unavailable"); return data as T;
}
