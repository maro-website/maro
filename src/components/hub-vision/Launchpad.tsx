"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Check } from "lucide-react";
import { copy, palettes } from "./content";
import { ToolFooter } from "./ToolFooter";
import s from "./HubVision.module.css";

export function IdentityMark({ className }: { className?: string }) {
  return <svg viewBox="0 0 100 100" className={className} fill="currentColor" aria-hidden="true">
    <path d="M49 49H13C-3 49-3 25 13 25h12V13c0-16 24-16 24 0v36Zm2 0V13c0-16 24-16 24 0v12h12c16 0 16 24 0 24H51Zm0 2h36c16 0 16 24 0 24H75v12c0 16-24 16-24 0V51Zm-2 0v36c0 16-24 16-24 0V75H13c-16 0-16-24 0-24h36Z" />
  </svg>;
}

export function Launchpad() {
  const [palette, setPalette] = useState(0);
  const colors = palettes[palette];
  return <section className={s.launchpad} aria-label="Fillo të krijosh">
    <article className={s.imageDoor}>
      <Link href={copy.imazh.href} className={s.imageCanvas} aria-label="Hap maroImazh">
        <Image src="/images/hub-vision/blue-bloom.webp" alt="Një lule skulpturore blu mbi të verdhë, një drejtim vizual ilustrues" fill priority sizes="(max-width: 700px) 100vw, 62vw" />
        <p className={s.canvasHeadline}><span className={s.desktopHeadline}>{copy.imazh.line}</span><span className={s.mobileHeadline}>Ide pa<br />kufi.</span></p>
        <span className={s.imageCaption}><span className={s.tinySpark}>✳</span>{copy.example}</span>
        <span className={s.canvasArrow}><ArrowUpRight size={25} /></span>
      </Link>
      <ToolFooter {...copy.imazh} />
    </article>
    <article className={s.logoDoor} style={{ "--identity-ink": colors.ink, "--identity-paper": colors.paper, "--identity-accent": colors.accent } as CSSProperties}>
      <div className={s.identityCanvas}>
        <div className={s.identityTop}><span className={s.identityLabel}>IDENTITET · SHEMBULL</span></div>
        <Link href={copy.logo.href} className={s.identityArtwork} aria-label="Hap maroLogo">
          <div className={s.identityMain}>
            <div className={s.registration}><span>+</span><span>+</span></div>
            <div className={s.wordmark}><IdentityMark /><span>forma<sup>®</sup></span></div>
            <span className={s.brandTagline}>HAPËSIRË PËR IDE.</span>
            <div className={s.registration}><span>+</span><span>+</span></div>
          </div>
          <div className={s.identitySamples}>
            <div className={s.sampleBusiness}><span>forma®</span><small>Një këndvështrim i ri.<br />Çdo ditë.</small><ArrowUpRight size={22} /></div>
            <div className={s.sampleSymbol}><IdentityMark /><span>f / 01</span></div>
          </div>
        </Link>
        <div className={s.paletteBar}>
          <span>{copy.palette}</span>
          <div className={s.swatches} role="group" aria-label="Paleta e shembullit të identitetit">
            {palettes.map((p, i) => <button type="button" key={p.name} aria-label={p.name} aria-pressed={palette === i} onClick={() => setPalette(i)} style={{ "--swatch": p.ink } as CSSProperties}><span>{palette === i && <Check size={12} />}</span></button>)}
          </div>
        </div>
      </div>
      <ToolFooter {...copy.logo} />
    </article>
  </section>;
}
