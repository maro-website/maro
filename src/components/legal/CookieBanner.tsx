"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { OPEN_COOKIE_SETTINGS, browserRequestsPrivacy, readAnalyticsConsent, saveAnalyticsConsent, type AnalyticsConsent } from "@/lib/analytics/consent";

export function CookieBanner() {
  const [visible, setVisible] = React.useState(false);
  const [privacySignal, setPrivacySignal] = React.useState(false);

  React.useEffect(() => {
    setVisible(readAnalyticsConsent() === null);
    setPrivacySignal(browserRequestsPrivacy());
    const open = () => setVisible(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS, open);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS, open);
  }, []);

  const choose = (choice: AnalyticsConsent) => {
    saveAnalyticsConsent(choice);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Preferencat e cookies"
      className="fixed inset-x-0 bottom-0 z-[100] p-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:p-5"
    >
      <div className="mx-auto flex max-h-[70dvh] max-w-3xl flex-col gap-4 overflow-y-auto rounded-maro16 border border-line bg-surface p-5">
        <div>
        <p className="text-[16px] font-semibold text-ink">Cookies, me zgjedhjen tënde.</p>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
          Ruajtja e domosdoshme e mban Maro-n në punë. Me lejen tënde, Google Analytics na tregon sa vizita kemi dhe cilat faqe përdoren, që ta përmirësojmë platformën. Promptet, fotografitë dhe të dhënat e llogarisë nuk dërgohen te Google Analytics.{" "}
          <Link
            href="/legal/cookies"
            className="font-semibold text-ink underline-offset-2 hover:underline"
          >
            Politika e Cookies
          </Link>
          .
        </p>
        {privacySignal && <p className="mt-2 text-[14px] text-ink-2">Shfletuesi yt kërkon mosgjurmim. Analitika mbetet e fikur.</p>}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
          <Button variant="secondary" className="min-h-11" onClick={() => choose("denied")}>Refuzo analitikën</Button>
          <Button variant="brand" className="min-h-11" disabled={privacySignal} onClick={() => choose("granted")}>Prano analitikën</Button>
        </div>
      </div>
    </div>
  );
}
