"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { lookupPromoBySlug, trackPromo } from "@/lib/services/promoService";
import { Logo } from "@/components/ui/Logo";

// Referral link target: maro.al/r/<slug>. Logs a "link" event, then redirects to
// the credits page with the promo pre-applied.
export default function ReferralRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const { slug } = React.use(params);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const promo = await lookupPromoBySlug(slug);
      if (cancelled) return;
      if (promo) {
        await trackPromo(promo.code, "link");
        router.replace(`/credits?promo=${encodeURIComponent(promo.code)}&via=link`);
      } else {
        router.replace("/credits");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, router]);

  return (
    <div className="grid h-[100dvh] place-items-center bg-canvas">
      <div className="flex flex-col items-center gap-4">
        <Logo />
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-brand" />
        <p className="text-[13.5px] text-ink-3">Duke aplikuar zbritjen…</p>
      </div>
    </div>
  );
}
