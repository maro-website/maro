"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ANALYTICS_CONSENT_KEY, CONSENT_CHANGED, browserRequestsPrivacy, clearAnalyticsCookies, readAnalyticsConsent } from "@/lib/analytics/consent";
import { createAnalyticsTracker } from "@/lib/analytics/web";

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  [key: `ga-disable-${string}`]: boolean;
};

export function GoogleAnalytics({ measurementId, nonce }: { measurementId: string; nonce?: string }) {
  const pathname = usePathname();
  const tracker = useRef<ReturnType<typeof createAnalyticsTracker> | null>(null);

  useEffect(() => {
    if (!/^G-[A-Z0-9]+$/.test(measurementId) || !["maro.al", "www.maro.al"].includes(location.hostname)) return;
    const win = window as unknown as AnalyticsWindow;
    win.dataLayer ??= [];
    win.gtag ??= function () { win.dataLayer!.push(arguments); };
    tracker.current ??= createAnalyticsTracker(measurementId, {
      allowed: () => readAnalyticsConsent() === "granted" && !browserRequestsPrivacy(),
      pathname: () => location.pathname,
      disabled: value => { win[`ga-disable-${measurementId}`] = value; },
      command: (...args) => win.gtag!(...args),
      referrer: document.referrer,
      load: () => {
        if (document.getElementById("maro-google-analytics")) return;
        const script = document.createElement("script");
        script.id = "maro-google-analytics";
        script.async = true;
        if (nonce) script.nonce = nonce;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
        document.head.appendChild(script);
      },
    });
    const sync = () => {
      tracker.current?.sync();
      if (readAnalyticsConsent() !== "granted" || browserRequestsPrivacy()) {
        clearAnalyticsCookies();
        // Withdrawal/expiry also removes the loaded library's timers. No denied pings.
        if (document.getElementById("maro-google-analytics")) location.reload();
      }
    };
    const storage = (event: StorageEvent) => { if (event.key === ANALYTICS_CONSENT_KEY || event.key === null) sync(); };
    sync();
    window.addEventListener(CONSENT_CHANGED, sync);
    window.addEventListener("storage", storage);
    window.addEventListener("popstate", sync);
    const timer = window.setInterval(sync, 60_000);
    return () => {
      tracker.current?.pause();
      window.removeEventListener(CONSENT_CHANGED, sync);
      window.removeEventListener("storage", storage);
      window.removeEventListener("popstate", sync);
      window.clearInterval(timer);
    };
  }, [measurementId, nonce]);

  // Pause before private route content paints. Queries and fragments are never used.
  useLayoutEffect(() => { tracker.current?.sync(); }, [pathname]);
  return null;
}
