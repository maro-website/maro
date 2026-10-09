import { buildContentSecurityPolicy } from "@/lib/security/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resolveAccessRole, hasPermission, ADMIN_ENTRY_PERMISSION } from "@/lib/admin/permissions";
import {
  isComingSoonMode,
  isLaunchPublicRoute,
  LAUNCH_PAGE_PATH,
  LAUNCH_REQUEST_HEADER,
} from "@/lib/launch/config";

const ipBuckets = new Map<string, { count: number; reset: number }>();
const IP_LIMIT = 120;
const MAX_IP_BUCKETS = 10000;
const IP_WINDOW_MS = 60_000;

function checkIpLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  let b = ipBuckets.get(ip);
  if (!b || now > b.reset) {
    for (const [key, bucket] of ipBuckets) if (bucket.reset <= now) ipBuckets.delete(key);
    if (ipBuckets.size >= MAX_IP_BUCKETS) ipBuckets.delete(ipBuckets.keys().next().value!);
    b = { count: 0, reset: now + IP_WINDOW_MS };
    ipBuckets.set(ip, b);
  }
  b.count += 1;
  if (b.count > IP_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

async function getAdminAccessFromRequest(
  req: NextRequest
): Promise<"none" | "guest" | "admin"> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return "none";

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll() {
        /* read-only in middleware */
      },
    },
  });

  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return "guest";

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, access_role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return "guest";
  const role = resolveAccessRole(profile);
  if (!role || !hasPermission(role, ADMIN_ENTRY_PERMISSION)) return "none";
  return "admin";
}

async function hasAuthenticatedUser(req: NextRequest): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll() {
        /* The auth pages/callback own session cookie refreshes. */
      },
    },
  });

  const authorization = req.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : null;

  try {
    const { data } = bearer
      ? await supabase.auth.getUser(bearer)
      : await supabase.auth.getUser();
    return Boolean(data.user);
  } catch {
    return false;
  }
}

function requestHeaders(req: NextRequest, nonce?: string, policy?: string): Headers {
  const headers = new Headers(req.headers);
  headers.delete("x-nonce");
  headers.delete("Content-Security-Policy");
  if (nonce && policy) {
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", policy);
  }
  return headers;
}

function launchRequestHeaders(req: NextRequest, nonce?: string, policy?: string): Headers {
  const headers = requestHeaders(req, nonce, policy);
  headers.set(LAUNCH_REQUEST_HEADER, "1");
  return headers;
}

async function routeMiddleware(req: NextRequest, nonce?: string, policy?: string) {
  const path = req.nextUrl.pathname;

  if (isComingSoonMode() && !isLaunchPublicRoute(path)) {
    const authenticated = await hasAuthenticatedUser(req);
    if (!authenticated) {
      if (path.startsWith("/api/") || !["GET", "HEAD"].includes(req.method)) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }

      const destination = req.nextUrl.clone();
      destination.pathname = LAUNCH_PAGE_PATH;
      destination.search = "";
      const response = NextResponse.rewrite(destination, {
        request: { headers: launchRequestHeaders(req, nonce, policy) },
      });
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
      return response;
    }
  }

  if (path === LAUNCH_PAGE_PATH) {
    if (!isComingSoonMode()) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (await hasAuthenticatedUser(req)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next({ request: { headers: launchRequestHeaders(req, nonce, policy) } });
  }

  if (path.startsWith("/admin")) {
    const access = await getAdminAccessFromRequest(req);
    if (access === "guest") {
      const signIn = new URL("/sign-in", req.url);
      signIn.searchParams.set("next", path);
      return NextResponse.redirect(signIn);
    }
    if (access !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (!path.startsWith("/api/")) {
    const res = NextResponse.next({ request: { headers: requestHeaders(req, nonce, policy) } });
    if (path.startsWith("/admin")) {
      res.headers.set("x-maro-admin-path", path);
    }
    return res;
  }

  // Coarse instance-local burst protection only. Sensitive endpoints retain
  // their shared database limits keyed by verified user IDs.
  const forwarded = req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  const candidate = req.headers.get("x-real-ip")?.trim() || forwarded || "unknown";
  const ip = candidate.length <= 45 && /^[0-9a-f:.]+$/i.test(candidate) ? candidate : "unknown";

  const rl = checkIpLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const res = NextResponse.next({ request: { headers: requestHeaders(req, nonce, policy) } });
  res.headers.set("x-request-id", crypto.randomUUID());
  return res;
}

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/preview-runtime")) return routeMiddleware(req);
  const nonce = btoa(crypto.randomUUID());
  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host : undefined;
  const policy = buildContentSecurityPolicy({ supabaseHost, nonce });
  const response = await routeMiddleware(req, nonce, policy);
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|brand/|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
};
