/** Shared security header builders for Next.js config and application code. */

export const THEME_INIT_SCRIPT =
  "(function(){try{localStorage.setItem('maro.theme','mshelt');document.documentElement.removeAttribute('data-theme');var m=document.querySelector('meta[name=\"theme-color\"]');if(m)m.setAttribute('content','#F5F5F5');}catch(e){}})();";

export function buildContentSecurityPolicy(options = {}) {
  const supabaseHost = (options.supabaseHost || "*.supabase.co").replace(/^https?:\/\//, "");
  const isProduction = options.isProduction ?? process.env.NODE_ENV === "production";
  const connectHosts = ["'self'", `https://${supabaseHost}`, `wss://${supabaseHost}`];
  if (!isProduction) {
    connectHosts.push("ws://localhost:*", "http://localhost:*");
  }

  const parts = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://${supabaseHost} https://images.unsplash.com https://picsum.photos`,
    "font-src 'self' data:",
    `connect-src ${connectHosts.join(" ")}`,
    `media-src 'self' data: blob: https://${supabaseHost}`,
    "frame-src 'self' https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  if (isProduction) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

export function buildPermissionsPolicy() {
  return [
    "camera=()",
    "microphone=()",
    "geolocation=()",
    "payment=()",
    "usb=()",
    "bluetooth=()",
    "accelerometer=()",
    "gyroscope=()",
    "magnetometer=()",
    "display-capture=()",
    "browsing-topics=()",
  ].join(", ");
}

export function buildSecurityHeaders(options = {}) {
  const supabaseUrl = options.supabaseUrl;
  const isProduction = options.isProduction ?? process.env.NODE_ENV === "production";
  const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : undefined;

  const headers = [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy({ supabaseHost, isProduction }),
    },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: buildPermissionsPolicy() },
    { key: "X-XSS-Protection", value: "0" },
  ];

  if (options.cacheControl) {
    headers.push({ key: "Cache-Control", value: options.cacheControl });
  }

  return headers;
}
