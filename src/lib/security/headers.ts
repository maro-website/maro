export {
  THEME_INIT_SCRIPT,
  buildContentSecurityPolicy,
  buildPermissionsPolicy,
  buildSecurityHeaders,
} from "../../../security-headers.mjs";

export const NO_STORE_PATH_PREFIXES = [
  "/admin",
  "/account",
  "/sign-in",
  "/sign-up",
  "/checkout",
  "/order",
  "/pay",
  "/projects",
] as const;

export function cacheControlForPath(pathname: string): string | undefined {
  if (pathname.startsWith("/api/")) return "no-store";
  if (NO_STORE_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return "no-store";
  }
  return undefined;
}
