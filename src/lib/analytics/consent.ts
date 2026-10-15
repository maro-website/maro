export const ANALYTICS_CONSENT_KEY = "maro.analytics.consent.v1";
export const CONSENT_CHANGED = "maro:analytics-consent";
export const OPEN_COOKIE_SETTINGS = "maro:cookie-settings";
export const CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
export type AnalyticsConsent = "granted" | "denied";

// Previous informational notice dismissals are deliberately not read as consent.
export function parseAnalyticsConsent(raw: string | null, now = Date.now()): AnalyticsConsent | null {
  try {
    const value = JSON.parse(raw ?? "null");
    if (value?.version !== 1 || !["granted", "denied"].includes(value.analytics)) return null;
    if (!Number.isFinite(value.savedAt) || value.savedAt > now || now - value.savedAt >= CONSENT_MAX_AGE_MS) return null;
    return value.analytics;
  } catch { return null; }
}

let memoryConsent: AnalyticsConsent | null = null;
let memoryOnly = false;
export function readAnalyticsConsent(): AnalyticsConsent | null {
  if (memoryOnly) return memoryConsent;
  try { return parseAnalyticsConsent(localStorage.getItem(ANALYTICS_CONSENT_KEY)); }
  catch { return memoryConsent; }
}

export function browserRequestsPrivacy(): boolean {
  return navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

export function clearAnalyticsCookies(): void {
  // Remove only GA cookies; authentication, projects and workspace storage stay intact.
  const domains = ["", location.hostname, `.${location.hostname}`];
  if (location.hostname === "maro.al" || location.hostname === "www.maro.al") domains.push("maro.al", ".maro.al");
  for (const part of document.cookie.split(";")) {
    const name = part.split("=", 1)[0].trim();
    if (!/^_ga(?:_|$)/.test(name)) continue;
    for (const domain of domains) document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`;
  }
}

export function saveAnalyticsConsent(analytics: AnalyticsConsent): void {
  memoryConsent = analytics;
  try {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, JSON.stringify({ version: 1, analytics, savedAt: Date.now() }));
    memoryOnly = false;
  } catch { memoryOnly = true; }
  window.dispatchEvent(new Event(CONSENT_CHANGED));
  if (analytics === "denied") clearAnalyticsCookies();
}

export function openCookieSettings(): void { window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS)); }
