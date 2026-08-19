/** Public email asset paths — served from /public without auth. */
export const EMAIL_LOGO_ASSET_PATH = "/email/maro-logo-email.png";

/** Display dimensions in the canonical email shell (PNG is 2× for retina). */
export const EMAIL_LOGO_WIDTH = 120;
export const EMAIL_LOGO_HEIGHT = 31;

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

/** Absolute HTTPS PNG logo URL for transactional email clients. */
export function resolveEmailLogoUrl(origin?: string): string {
  const base = normalizeOrigin(origin ?? resolveEmailAssetOrigin());
  const assetOrigin = isPublicHttpsOrigin(base) ? base : PRODUCTION_ORIGIN;
  return `${assetOrigin}${EMAIL_LOGO_ASSET_PATH}`;
}

export function resolveEmailHomeUrl(origin?: string): string {
  return normalizeOrigin(origin ?? resolveEmailAssetOrigin());
}
