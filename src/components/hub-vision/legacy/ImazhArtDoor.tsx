"use client";

/**
 * Archived maroImazh Hub art-directed door (blue-bloom, headlines, caption, arrow).
 * Preserved for possible reuse — not mounted in the live Hub.
 */
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { copy } from "../content";
import s from "../HubVision.module.css";

export function ImazhArtDoor() {
  return (
    <Link href={copy.imazh.href} className={s.imageCanvas} aria-label="Hap maroImazh">
      <Image
        src="/images/hub-vision/blue-bloom.webp"
        alt="Një lule skulpturore blu mbi të verdhë, një drejtim vizual ilustrues"
        fill
        priority
        sizes="(max-width: 700px) 100vw, 62vw"
      />
      <p className={s.canvasHeadline}>
        <span className={s.desktopHeadline}>{copy.imazh.line}</span>
        <span className={s.mobileHeadline}>
          Ide pa
          <br />
          kufi.
        </span>
      </p>
      <span className={s.imageCaption}>
        <span className={s.tinySpark}>✳</span>
        {copy.example}
      </span>
      <span className={s.canvasArrow}>
        <ArrowUpRight size={25} />
      </span>
    </Link>
  );
}
