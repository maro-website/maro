import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ipBuckets = new Map<string, { count: number; reset: number }>();
const IP_LIMIT = 600;
const IP_WINDOW_MS = 3600_000;

function checkIpLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  let b = ipBuckets.get(ip);
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + IP_WINDOW_MS };
    ipBuckets.set(ip, b);
  }
  b.count += 1;
  if (b.count > IP_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (!path.startsWith("/api/")) {
    return NextResponse.next();
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const rl = checkIpLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const res = NextResponse.next();
  res.headers.set("x-request-id", crypto.randomUUID());
  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
