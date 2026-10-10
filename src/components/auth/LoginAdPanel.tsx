"use client";
import { rateLimitedFetch as fetch } from "@/lib/client/rateLimit";

import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import type { PublicLoginAd } from "@/lib/loginAds/types";

export function LoginAdPanel() {
  const [ad, setAd] = React.useState<PublicLoginAd | null>(null);
  const [confirming, setConfirming] = React.useState(false);

  React.useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/login-ad", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ ad?: PublicLoginAd | null }> : { ad: null })
      .then((data) => setAd(data.ad ?? null))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const host = React.useMemo(() => {
    if (!ad) return "";
    try { return new URL(ad.externalUrl).hostname.replace(/^www\./, ""); }
    catch { return "faqja e jashtme"; }
  }, [ad]);

  return (
    <>
      <section className="relative aspect-[860/627] min-h-[360px] overflow-hidden rounded-maro24 bg-brand-soft lg:min-h-[627px]" aria-label="Reklamë">
        {ad ? (
          <button type="button" onClick={() => setConfirming(true)} className="group absolute inset-0 h-full w-full cursor-pointer overflow-hidden text-left" aria-label={`Vizito reklamën në ${host}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ad.imageUrl} alt="Reklamë" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.015]" />
            <span className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-maro-raised text-ink opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"><ArrowUpRight size={18} /></span>
          </button>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-center text-[22px] font-semibold leading-tight text-ink/80 sm:text-[28px]"><span>ADVERTISING<br />860×627px</span></div>
        )}
      </section>

      <Modal open={confirming} onClose={() => setConfirming(false)} size="sm">
        <ModalHeader title="Je tu dal jashtë maro" description={`Ky link të çon te ${host}. A don me vazhdu?`} />
        <ModalFooter>
          <Button variant="secondary" onClick={() => setConfirming(false)}>Mbylle</Button>
          {ad ? <a href={ad.externalUrl} target="_blank" rel="noopener noreferrer nofollow" className="maro-button" data-variant="brand" data-size="md" onClick={() => setConfirming(false)}>Vizito <ArrowUpRight size={17} /></a> : null}
        </ModalFooter>
      </Modal>
    </>
  );
}
