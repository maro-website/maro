import { NextResponse, type NextRequest } from "next/server";

// Temporary production maintenance. Set false and deploy to reopen Maro.
export const MAINTENANCE_ENABLED = true;
export const MAINTENANCE_HEALTH_PATH = "/api/health";

const maintenanceHtml = `<!doctype html>
<html lang="en" data-theme="mshelt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <meta name="theme-color" content="#111315">
  <title>Technical update coming soon · Maro</title>
  <link rel="icon" href="/brand/maro-symbol.svg" type="image/svg+xml">
  <style>
    /* Self-contained downtime page using the existing Mshelt brand palette. */
    :root { color-scheme: dark; --canvas: #111315; --ink: #f2f4f6; --muted: #bcc3cb; --accent: #00ff72; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--canvas); color: var(--ink); font-family: Manrope, system-ui, sans-serif; }
    main { min-height: 100vh; min-height: 100svh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; text-align: center; }
    img { display: block; width: 160px; height: auto; margin-bottom: 48px; }
    .status { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 14px; line-height: 1.5; margin: 0 0 16px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
    h1 { max-width: 640px; margin: 0; font-size: clamp(28px, 5vw, 40px); line-height: 1.2; font-weight: 700; letter-spacing: -.03em; text-wrap: balance; }
    .note { max-width: 480px; margin: 24px 0 0; color: var(--muted); font-size: 16px; line-height: 1.5; }
  </style>
</head>
<body>
  <main>
    <img src="/brand/maro-logo-white.svg" alt="Maro" width="160" height="44">
    <p class="status"><span class="dot" aria-hidden="true"></span>Under maintenance</p>
    <h1>Technical update coming soon</h1>
    <p class="note">We’re making a few improvements. We’ll be back soon.</p>
  </main>
</body>
</html>`;

export function maintenanceResponse(
  request: NextRequest,
  enabled = MAINTENANCE_ENABLED,
): NextResponse | null {
  const path = request.nextUrl.pathname;
  const readOnly = request.method === "GET" || request.method === "HEAD";
  const headers = {
    "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Maro-Maintenance": enabled ? "1" : "0",
  };

  // Railway probes service health separately from the intentionally unavailable UI.
  if (path === MAINTENANCE_HEALTH_PATH && readOnly) {
    return new NextResponse(request.method === "HEAD" ? null : JSON.stringify({ status: "ok", maintenance: enabled }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
  if (!enabled) return null;

  // Existing handlers still authenticate these background/settlement requests.
  if (path.startsWith("/api/cron/") || path.startsWith("/api/webhooks/") || path === "/api/payments/raiaccept/webhook") {
    return null;
  }

  const unavailableHeaders = { ...headers, "Retry-After": "300" };
  if (path === "/api" || path.startsWith("/api/") || !readOnly) {
    return new NextResponse(request.method === "HEAD" ? null : JSON.stringify({
      error: "maintenance",
      message: "Technical update coming soon",
    }), { status: 503, headers: { ...unavailableHeaders, "Content-Type": "application/json" } });
  }

  return new NextResponse(request.method === "HEAD" ? null : maintenanceHtml, {
    status: 503,
    headers: { ...unavailableHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}
