export interface ClientRateLimit { expiresAt: number; known: boolean; scope: string }
let current: ClientRateLimit | null = null;
const listeners = new Set<() => void>();
export const rateLimitSnapshot = () => current;
export const subscribeRateLimit = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function clearClientRateLimit() { current = null; listeners.forEach(listener => listener()); }

export function retryAfterSeconds(header: string | null, body: unknown, now = Date.now()): number | null {
  const raw = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const bodySeconds = Number(raw.retry_after ?? raw.retryAfter);
  const headerSeconds = header && /^\d+(?:\.\d+)?$/.test(header.trim()) ? Number(header) : header ? (Date.parse(header) - now) / 1000 : NaN;
  const seconds = [headerSeconds, bodySeconds].find(value => Number.isFinite(value) && value > 0 && value <= 604800);
  return seconds === undefined ? null : Math.ceil(seconds);
}

export function reportClientRateLimit(seconds: number | null, scope: string, now = Date.now()) {
  if (typeof window === "undefined") return;
  const next = { expiresAt: now + (seconds ?? 60) * 1000, known: seconds !== null, scope };
  if (!(current?.scope === scope && current.known && !next.known && current.expiresAt > now)) current = next;
  listeners.forEach(listener => listener());
}

/** Observe HTTP 429 without replacing or consuming the response for its caller. */
export const rateLimitedFetch: typeof fetch = async (input, init) => {
  const response = await globalThis.fetch(input, init);
  if (response.status === 429 && typeof window !== "undefined") {
    let body: unknown = null;
    try { if (response.headers.get("content-type")?.includes("json")) body = await response.clone().json(); } catch { /* Header still usable. */ }
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    let scope = "Ky veprim";
    if (/\/auth\/.*sign.?up/.test(url)) scope = "Regjistrimi";
    else if (/\/auth\/.*resend/.test(url)) scope = "Konfirmimi i email-it";
    else if (/\/auth\/.*(?:forgot|recover)/.test(url)) scope = "Rivendosja e fjalëkalimit";
    else if (/\/auth\//.test(url)) scope = "Hyrja";
    else if (/\/ai\//.test(url)) scope = "Gjenerimi";
    else if (/\/admin\//.test(url)) scope = "Veprimi administrativ";
    reportClientRateLimit(retryAfterSeconds(response.headers.get("Retry-After"), body), scope);
  }
  return response;
};

export function formatRetryTime(seconds: number) {
  const value = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(value / 3600);
  return `${hours ? `${hours}:` : ""}${String(Math.floor(value / 60) % 60).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
