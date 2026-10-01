"use client";

/**
 * Archived maroLogo Hub identity study (forma mock, palette controls).
 * Preserved for possible reuse — not mounted in the live Hub.
 */
import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { copy, palettes } from "../content";
import { IdentityMark } from "./IdentityMark";
import s from "../HubVision.module.css";

export function LogoIdentityMock() {
  const [palette, setPalette] = useState(0);
  const colors = palettes[palette];
  return (
    <div
      className={s.identityCanvas}
      style={
        {
          "--identity-ink": colors.ink,
          "--identity-paper": colors.paper,
          "--identity-accent": colors.accent,
        } as CSSProperties
      }
    >
      <div className={s.identityTop}>
        <span className={s.identityLabel}>IDENTITET · SHEMBULL</span>
      </div>
      <Link href={copy.logo.href} className={s.identityArtwork} aria-label="Hap maroLogo">
        <div className={s.identityMain}>
          <div className={s.registration}>
            <span>+</span>
            <span>+</span>
          </div>
          <div className={s.wordmark}>
            <IdentityMark />
            <span>
              forma<sup>®</sup>
            </span>
          </div>
          <span className={s.brandTagline}>HAPËSIRË PËR IDE.</span>
          <div className={s.registration}>
            <span>+</span>
            <span>+</span>
          </div>
        </div>
        <div className={s.identitySamples}>
          <div className={s.sampleBusiness}>
            <span>forma®</span>
            <small>
              Një këndvështrim i ri.
              <br />
              Çdo ditë.
            </small>
            <ArrowUpRight size={22} />
          </div>
          <div className={s.sampleSymbol}>
            <IdentityMark />
            <span>f / 01</span>
          </div>
        </div>
      </Link>
      <div className={s.paletteBar}>
        <span>{copy.palette}</span>
        <div className={s.swatches} role="group" aria-label="Paleta e shembullit të identitetit">
          {palettes.map((p, i) => (
            <button
              type="button"
              key={p.name}
              aria-label={p.name}
              aria-pressed={palette === i}
              onClick={() => setPalette(i)}
              style={{ "--swatch": p.ink } as CSSProperties}
            >
              <span>{palette === i && <Check size={12} />}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
