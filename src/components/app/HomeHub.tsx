"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { HubToolTile } from "@/components/hub/HubToolTile";
import { MarketingBanner } from "@/components/hub/MarketingBanner";
import { PromoCard } from "@/components/hub/PromoCard";
import { useMaro } from "@/context/store";
import { Megaphone, Lightbulb } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const HUB_TOOLS = [
  { id: "imazh", label: "maroImazh", toolId: "reklama", href: "/imazh" },
  { id: "marologo", label: "maroLogo", toolId: "logo", href: "/marologo" },
  { id: "web", label: "maroWeb", toolId: "website", href: "/web" },
  { id: "filma", label: "maroFilma", toolId: "filma", href: "/filma", locked: true },
  { id: "audio", label: "maroZo", toolId: "zo", href: "/audio", locked: true },
  { id: "marketing", label: "maroMarketing", href: "/marketing", icon: Megaphone, locked: true },
] as const;

/** Hub home — greeting, credits, tool tiles, marketing banner, promo cards. */
export function HomeHub({ firstName }: { firstName?: string }) {
  const { user, credits } = useMaro();

  return (
    <div className="flex min-h-full w-full flex-col items-center bg-hub-page px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex w-full max-w-[var(--layout-module-max)] flex-col items-center gap-12"
      >
        <header className="text-center">
          <h1 className="text-[clamp(32px,5vw,48px)] font-bold leading-[1.12] tracking-brand text-ink">
            Cka po marojna sot{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-4 text-[16px] text-ink-2">Krejt tools-at me ni vend, nisja maro.</p>
          {user && (
            <p className="mt-3 text-[15px] text-ink-2">
              Ke{" "}
              <span className="font-bold tabular-nums text-brand">{credits.toLocaleString("de-DE")}</span>{" "}
              kredite ·{" "}
              <Link href="/pricing" className="font-semibold text-brand hover:underline">
                Planet &amp; rimbushje
              </Link>
            </p>
          )}
        </header>

        <div className="flex w-full flex-wrap justify-center gap-[var(--hub-tile-gap)]">
          {HUB_TOOLS.map((t) => (
            <HubToolTile
              key={t.id}
              id={t.id}
              label={t.label}
              toolId={"toolId" in t ? t.toolId : undefined}
              icon={"icon" in t ? t.icon : undefined}
              href={t.href}
              locked={"locked" in t ? t.locked : false}
            />
          ))}
          <HubToolTile
            id="presets"
            label="maroPresets"
            href="/prompts"
            icon={Lightbulb}
          />
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
            title="maroFilma"
            subtitle="Video AI — vjen së shpejti"
            ctaLabel="Mëso më shumë"
            href="/filma"
          />
        </div>
      </motion.div>
    </div>
  );
}
