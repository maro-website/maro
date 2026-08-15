"use client";

import { motion } from "framer-motion";
import { HubToolTile } from "@/components/hub/HubToolTile";
import { MarketingBanner } from "@/components/hub/MarketingBanner";
import { PromoCard } from "@/components/hub/PromoCard";
import { Megaphone } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const HUB_TOOLS = [
  { id: "imazh", label: "maroImazh", toolId: "reklama", href: "/imazh" },
  { id: "web", label: "maroWeb", toolId: "website", href: "/web" },
  { id: "filma", label: "maroFilma", toolId: "filma", href: "/filma", locked: true },
  { id: "audio", label: "maroAudio", toolId: "zo", href: "/audio", locked: true },
  { id: "marketing", label: "maroMarketing", href: "/marketing", icon: Megaphone },
] as const;

/** Hub home — greeting, 5 tool tiles, marketing banner, promo cards. */
export function HomeHub({ firstName }: { firstName?: string }) {
  return (
    <div className="flex min-h-full w-full flex-col items-center bg-hub-page px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex w-full max-w-[1120px] flex-col items-center gap-8"
      >
        <header className="text-center">
          <h1 className="text-[clamp(32px,5vw,48px)] font-bold leading-[1.12] tracking-brand text-ink">
            Cka po marojna sot{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-4 text-[16px] text-ink-2">Krejt tools-at me ni vend, nisja maro.</p>
        </header>

        <div className="flex w-full flex-wrap justify-center gap-[29px]">
          {HUB_TOOLS.map((t) => (
            <HubToolTile
              key={t.id}
              label={t.label}
              toolId={"toolId" in t ? t.toolId : undefined}
              icon={"icon" in t ? t.icon : undefined}
              href={t.href}
              locked={"locked" in t ? t.locked : false}
            />
          ))}
        </div>

        <MarketingBanner />

        <div className="flex w-full flex-col items-center justify-center gap-[30px] sm:flex-row sm:flex-wrap">
          <PromoCard
            title="1000+"
            subtitle="presets te gatshme"
            ctaLabel="Eksploro"
            href="/prompts"
          />
          <PromoCard
            title="Seedance 2.5"
            subtitle="30 sekonda / 1080p kualitet"
            ctaLabel="maro tash"
            href="/filma"
          />
        </div>
      </motion.div>
    </div>
  );
}
