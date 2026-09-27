/** Public email asset paths — served from /public without auth. */
export const EMAIL_SYMBOL_ASSET_PATH = "/email/maro-symbol-email.png";

/** Display dimensions in the canonical email shell (PNG is 2× for retina). */
export const EMAIL_SYMBOL_WIDTH = 40;
export const EMAIL_SYMBOL_HEIGHT = 40;

/** @deprecated Use EMAIL_SYMBOL_ASSET_PATH — wordmark logo removed from transactional email. */
export const EMAIL_LOGO_ASSET_PATH = EMAIL_SYMBOL_ASSET_PATH;

const PRODUCTION_ORIGIN = "https://maro.al";

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function configuredAppOrigin(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return raw ? normalizeOrigin(raw) : null;
}

function isPublicHttpsOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".local");
  } catch {
    return false;
  }
}

/**
 * Origin used for publicly reachable email assets.
 * Falls back to production when dev/local origins would break Gmail image loads.
 */
export function resolveEmailAssetOrigin(): string {
  const configured = configuredAppOrigin();
  if (configured && isPublicHttpsOrigin(configured)) return configured;
  return PRODUCTION_ORIGIN;
}

/** Absolute HTTPS PNG symbol URL for transactional email clients. */
export function resolveEmailSymbolUrl(origin?: string): string {
  const base = normalizeOrigin(origin ?? resolveEmailAssetOrigin());
  const assetOrigin = isPublicHttpsOrigin(base) ? base : PRODUCTION_ORIGIN;
  return `${assetOrigin}${EMAIL_SYMBOL_ASSET_PATH}`;
}

/** @deprecated Use resolveEmailSymbolUrl */
export function resolveEmailLogoUrl(origin?: string): string {
  return resolveEmailSymbolUrl(origin);
}

export function resolveEmailHomeUrl(origin?: string): string {
  return normalizeOrigin(origin ?? resolveEmailAssetOrigin());
}
