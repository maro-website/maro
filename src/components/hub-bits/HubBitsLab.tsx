"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { HUB_BITS, hubBitBySlug } from "./registry";
import s from "./HubBitsLab.module.css";

const HubHeroColorBends = dynamic(
  () => import("@/components/hub-vision/HubHeroColorBends").then((m) => m.HubHeroColorBends),
  { ssr: false }
);

const HubHeroDither = dynamic(
  () => import("@/components/hub-vision/HubHeroDither").then((m) => m.HubHeroDither),
  { ssr: false }
);

const CursorGrid = dynamic(() => import("@/components/hub-vision/CursorGrid"), { ssr: false });

const SoftAurora = dynamic(() => import("@/components/hub-vision/SoftAurora"), { ssr: false });

function BitStage({ slug }: { slug: string }) {
  const entry = hubBitBySlug(slug);

  if (!entry) {
    return (
      <div className={s.message}>
        <p>
          S’njohim <strong>{slug}</strong>. Zgjidh një slug nga lista lart ose shiko{" "}
          <code>/hub-bits</code> pa parametër.
        </p>
      </div>
    );
  }

  if (entry.status === "removed") {
    return (
      <div className={s.message}>
        <p>
          <strong>{entry.label}</strong> ({entry.slug}) — skedarët u hoqën nga repo.
          {entry.note ? ` ${entry.note}` : " Dërgo përsëri prompt-in nga React Bits për ta rikthyer."}
        </p>
      </div>
    );
  }

  switch (slug) {
    case "color-bends":
      return (
        <div className={s.fadeMask}>
          <HubHeroColorBends />
        </div>
      );
    case "dither":
      return (
        <div className={s.fadeMask}>
          <HubHeroDither />
        </div>
      );
    case "cursor-grid":
      return (
        <CursorGrid
          className={s.stageInner}
          cellSize={70}
          color="#00ff72"
          radius={140}
          falloff="smooth"
          holdTime={400}
          fadeDuration={800}
          lineWidth={1.2}
          maxOpacity={1}
          fillOpacity={0}
          gridOpacity={0.045}
          cellRadius={0}
          clickPulse
          pulseSpeed={600}
          globalPointer
        />
      );
    case "soft-aurora":
      return (
        <SoftAurora
          className={s.stageInner}
          speed={0.6}
          scale={0.6}
          brightness={1}
          color1="#00ff72"
          color2="#00ff72"
          noiseFrequency={2}
          noiseAmplitude={2.5}
          bandHeight={0.5}
          bandSpread={1.5}
          octaveDecay={0.19}
          layerOffset={0}
          colorSpeed={1}
          enableMouseInteraction
          mouseInfluence={0.1}
          globalPointer
        />
      );
    default:
      return null;
  }
}

export function HubBitsLab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("bit");

  return (
    <div className={s.lab}>
      <header className={s.chrome}>
        <Link href="/">← Hub</Link>
        <span style={{ fontSize: 13, color: "#a3a3a3" }}>React Bits lab (dev)</span>
        <nav className={s.pills} aria-label="React Bits">
          {HUB_BITS.map((bit) => {
            const isActive = bit.slug === active;
            const disabled = bit.status === "removed";
            return (
              <button
                key={bit.slug}
                type="button"
                className={s.pill}
                data-active={isActive}
                data-removed={disabled}
                disabled={disabled}
                onClick={() => router.push(`/hub-bits?bit=${bit.slug}`)}
              >
                {bit.label}
              </button>
            );
          })}
        </nav>
      </header>
      <div className={s.stage}>
        <div className={s.stageInner}>
          {active ? (
            <BitStage slug={active} />
          ) : (
            <div className={s.message}>
              <p>
                Zgjidh një bit ose hap direkt, p.sh.{" "}
                <Link href="/hub-bits?bit=color-bends">color-bends</Link>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
