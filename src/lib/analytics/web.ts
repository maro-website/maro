/** Static, reviewed route names only. Never send arbitrary URLs, titles or user content. */
const PAGES: Readonly<Record<string, string>> = {
  "/": "Hub", "/imazh": "Imazh", "/marologo": "Logo", "/logo": "Logo", "/brand": "Logo",
  "/brain": "Brain", "/presets": "Presets", "/explore": "Explore", "/pricing": "Planet dhe kreditet",
  "/web": "Web", "/filma": "Filma", "/audio": "Audio", "/zo": "Audio", "/marketing": "Marketing",
  "/academy": "Academy", "/kreator": "Kreator", "/contests": "Garat", "/case-studies": "Rastet e përdorimit",
  "/contact": "Kontakt", "/sign-in": "Hyr", "/sign-up": "Regjistrohu", "/bonus": "Kredite falas",
  "/legal/cookies": "Politika e Cookies", "/legal/privacy": "Politika e Privatësisë",
  "/legal/terms": "Kushtet e Përdorimit", "/legal/refund": "Politika e Rimbursimit", "/legal/fair-use": "Përdorimi i drejtë",
};

export function analyticsPage(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  const name = PAGES[path];
  return name ? { page_location: `https://maro.al${path}`, page_title: `maro.al - ${name}`, page_path: path } : null;
}

export function analyticsReferrer(referrer: string): string {
  try {
    const url = new URL(referrer);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    if (["maro.al", "www.maro.al"].includes(url.hostname)) return analyticsPage(url.pathname)?.page_location ?? "https://maro.al/";
    return url.origin + "/";
  } catch { return ""; }
}

export const DENIED_CONSENT = {
  analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
} as const;

export function analyticsConfig(page: NonNullable<ReturnType<typeof analyticsPage>>, referrer: string) {
  return {
    ...page, page_referrer: referrer, send_page_view: false,
    allow_google_signals: false, allow_ad_personalization_signals: false,
    ads_data_redaction: true, url_passthrough: false,
    cookie_expires: 180 * 24 * 60 * 60, cookie_update: false, cookie_flags: "SameSite=Lax;Secure",
  };
}

export interface AnalyticsTransport {
  allowed: () => boolean;
  pathname: () => string;
  disabled: (value: boolean) => void;
  command: (...args: unknown[]) => void;
  load: () => void;
  referrer: string;
}

/** Consent and route gates apply before loading and before every manual page view. */
export function createAnalyticsTracker(measurementId: string, transport: AnalyticsTransport) {
  let configured = false;
  let lastPath: string | null = null;
  let referrer = analyticsReferrer(transport.referrer);
  return {
    sync() {
      const page = analyticsPage(transport.pathname());
      if (!/^G-[A-Z0-9]+$/.test(measurementId) || !transport.allowed() || !page) {
        transport.disabled(true);
        lastPath = null;
        return;
      }
      transport.disabled(false);
      const firstView = !configured;
      if (!configured) {
        transport.command("consent", "default", DENIED_CONSENT);
        transport.command("set", "ads_data_redaction", true);
        transport.command("set", "url_passthrough", false);
        transport.command("consent", "update", { ...DENIED_CONSENT, analytics_storage: "granted" });
        transport.command("js", new Date());
        configured = true;
      }
      if (lastPath === page.page_path) return;
      transport.command("set", { page_location: page.page_location, page_title: page.page_title, page_referrer: referrer });
      // Refresh config too: subsequent engagement events must use the new safe page.
      transport.command("config", measurementId, analyticsConfig(page, referrer));
      transport.command("event", "page_view", { ...page, page_referrer: referrer, send_to: measurementId });
      if (firstView) transport.load();
      lastPath = page.page_path;
      referrer = page.page_location;
    },
    pause() { transport.disabled(true); },
  };
}
