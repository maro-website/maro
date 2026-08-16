import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resolveAccessRole, hasPermission, ADMIN_ENTRY_PERMISSION } from "@/lib/admin/permissions";

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

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

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
    const res = NextResponse.next();
    if (path.startsWith("/admin")) {
      res.headers.set("x-maro-admin-path", path);
    }
    return res;
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
  matcher: ["/api/:path*", "/admin/:path*"],
};
