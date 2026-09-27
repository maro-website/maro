import "server-only";

import { isProduction } from "@/lib/config/serverEnv";

const PRODUCTION_ORIGIN = "https://maro.al";
const DEV_ORIGIN = "http://localhost:3006";

const BLOCKED_HOSTS = new Set(["0.0.0.0", "127.0.0.1", "localhost"]);

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

/** Reject Railway/internal bind addresses and other non-public origins. */
export function isTrustedPublicOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();

    if (BLOCKED_HOSTS.has(host)) return false;
    if (host.endsWith(".railway.internal")) return false;
    if (host.endsWith(".local")) return false;

    if (isProduction()) {
      return url.protocol === "https:" && !BLOCKED_HOSTS.has(host);
    }

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function originCandidates(): string[] {
  return [
    process.env.APP_ORIGIN?.trim(),
    process.env.NEXT_PUBLIC_APP_URL?.trim(),
    process.env.APP_URL?.trim(),
    process.env.NEXT_PUBLIC_SITE_URL?.trim(),
  ].filter(Boolean) as string[];
}

/**
 * Trusted public application origin for auth URLs and redirects.
 * Never derive from request.url, Host, or Railway internal bind (0.0.0.0:8080).
 */
export function getAppOrigin(): string {
  for (const raw of originCandidates()) {
    const normalized = normalizeOrigin(raw);
    if (isTrustedPublicOrigin(normalized)) return normalized;
  }

  if (isProduction()) return PRODUCTION_ORIGIN;
  return DEV_ORIGIN;
}

/** Build an absolute public URL on the trusted app origin. */
export function buildPublicUrl(path: string, query?: Record<string, string | undefined>): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, `${getAppOrigin()}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }
  return url.toString();
}
