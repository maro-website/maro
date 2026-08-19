import "server-only";

import { isProduction } from "@/lib/config/serverEnv";

/**
 * Trusted application origin for auth email links.
 * Never derive from Host headers — prevents open-redirect / origin spoofing.
 */
export function getAppOrigin(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (isProduction()) {
    return "https://maro.al";
  }

  return "http://localhost:3006";
}
