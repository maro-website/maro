export type PublicLaunchMode = "coming_soon" | "live";

const AUTH_PAGE_ROUTES = new Set([
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/confirm-email",
  "/reset-password",
  "/auth/callback",
]);

const PUBLIC_API_PREFIXES = [
  "/api/auth/",
  "/api/cron/",
  "/api/webhooks/",
];

export const LAUNCH_PAGE_PATH = "/coming-soon";
export const LAUNCH_REQUEST_HEADER = "x-maro-launch-gate";

export function resolvePublicLaunchMode(
  value = process.env.PUBLIC_LAUNCH_MODE
): PublicLaunchMode {
  return value?.trim().toLowerCase() === "coming_soon" ? "coming_soon" : "live";
}

export function isComingSoonMode(value = process.env.PUBLIC_LAUNCH_MODE): boolean {
  return resolvePublicLaunchMode(value) === "coming_soon";
}

export function isLaunchPublicRoute(pathname: string): boolean {
  if (pathname === LAUNCH_PAGE_PATH || AUTH_PAGE_ROUTES.has(pathname)) return true;
  if (pathname === "/api/launch-waitlist") return true;
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
