"use client";

import { motion } from "framer-motion";
import { HubToolTile } from "@/components/hub/HubToolTile";
import { MarketingBanner } from "@/components/hub/MarketingBanner";
import { PromoCard } from "@/components/hub/PromoCard";
import { RecentPresets } from "@/components/hub/RecentPresets";
import { HUB_TOOLS } from "@/components/hub/hubTools";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Hub home — greeting, credits, tool tiles, marketing banner, promo cards. */
export function HomeHub({ firstName }: { firstName?: string }) {
  return (
    <div className="flex min-h-full w-full flex-col items-center bg-hub-page px-4 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:pb-32 lg:pt-28">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex w-full max-w-[var(--layout-module-max)] flex-col items-center gap-8 sm:gap-10 lg:gap-12"
      >
        <header className="text-center">
          <h1 className="text-[clamp(34px,5vw,52px)] font-bold leading-[1.04] tracking-brand text-ink">
            Cka po marojna sot{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-4 text-[16px] text-ink-2">Krejt tools-at me ni vend, nisja maro.</p>
        </header>

        <div className="flex w-full max-w-[var(--hub-banner-max)] flex-wrap items-center justify-center gap-4 sm:gap-5 lg:gap-[var(--hub-tile-gap)]">
          {HUB_TOOLS.map((t) => (
            <HubToolTile
              key={t.id}
              label={t.label}
              toolId={t.toolId}
              href={t.href}
              backgroundImage={t.backgroundImage}
              locked={"locked" in t ? t.locked : false}
            />
          ))}
        </div>

        <MarketingBanner />

        <div className="flex w-full flex-col items-center justify-center gap-[var(--hub-promo-gap)] sm:flex-row sm:flex-wrap">
          <PromoCard
            title="1000+"
            subtitle="presets te gatshme"
            ctaLabel="Eksploro"
            href="/prompts"
          />
          <PromoCard
            title="maroLogo"
            subtitle="Identiteti yt, hap pas hapi."
            ctaLabel="Nis wizard-in"
            href="/marologo"
          />
        </div>

        <RecentPresets />
      </motion.div>
    </div>
  );
}
