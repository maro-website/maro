"use client";
import * as React from "react";
import { ImageIcon } from "lucide-react";
import { chooseLogoBackdrop, type LogoBackdrop } from "@/lib/brain-studio/logo";
import styles from "./BrainStudio.module.css";

const cache = new Map<string, "light" | "dark">();
export function BrainLogo({ src, alt = "Logoja e brendit", backdrop = "auto", compact = false, lazy = false }: { src?: string | null; alt?: string; backdrop?: LogoBackdrop; compact?: boolean; lazy?: boolean }) {
  return <LogoArtwork key={src || "empty"} src={src} alt={alt} backdrop={backdrop} compact={compact} lazy={lazy}/>;
}
function LogoArtwork({ src, alt, backdrop, compact, lazy }: { src?: string | null; alt: string; backdrop: LogoBackdrop; compact: boolean; lazy: boolean }) {
  const [automatic, setAutomatic] = React.useState<"light" | "dark">(() => cache.get(src || "") || "light");
  const [noCors, setNoCors] = React.useState(false), [broken, setBroken] = React.useState(false);
  const inspect = (image: HTMLImageElement) => {
    if (!src || cache.has(src)) return;
    try {
      const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0, 64, 64);
      const value = chooseLogoBackdrop(context.getImageData(0, 0, 64, 64).data);
      if (cache.size >= 100) cache.clear(); cache.set(src, value); setAutomatic(value);
    } catch { /* Cross-origin artwork remains visible; the preview also offers manual mats. */ }
  };
  return <span className={styles.logoMat} data-backdrop={backdrop === "auto" ? automatic : backdrop} data-compact={compact}>
    {src && !src.startsWith("storage:") && !broken ? /* eslint-disable-next-line @next/next/no-img-element */
      <img src={src} alt={alt} loading={lazy ? "lazy" : undefined} crossOrigin={src.startsWith("data:") || noCors ? undefined : "anonymous"} onLoad={event => inspect(event.currentTarget)} onError={() => { if (!noCors) setNoCors(true); else setBroken(true); }}/>
      : <span className={styles.logoEmpty}><ImageIcon size={compact ? 20 : 28} aria-hidden="true"/>{!compact && <span>{broken ? "Parapamja nuk u ngarkua" : "Shto logon e brendit"}</span>}</span>}
  </span>;
}
