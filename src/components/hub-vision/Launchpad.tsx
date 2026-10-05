"use client";

import Link from "next/link";
import { copy } from "./content";
import { ToolFooter } from "./ToolFooter";
import s from "./HubVision.module.css";

const LOGO_VIDEO_SRC = "/videos/hub-vision/maroLogo-videohero01.mp4";
const IMAZH_HERO_SRC = "/images/hub-vision/maroimazh-hero01.png";

export function Launchpad() {
  return (
    <section className={s.launchpad} aria-label="Fillo të krijosh">
      <article className={s.imageDoor}>
        <Link href={copy.imazh.href} className={`${s.imazhHeroCanvas} block`} aria-label="Hap maroImazh">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={s.imazhHeroImage} src={IMAZH_HERO_SRC} alt="" />
        </Link>
        <ToolFooter {...copy.imazh} />
      </article>
      <article className={s.logoDoor}>
        <Link href={copy.logo.href} className={`${s.logoVideoCanvas} block`} aria-label="Hap maroLogo">
          <video
            className={s.logoVideo}
            src={LOGO_VIDEO_SRC}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            disablePictureInPicture
            disableRemotePlayback
          />
        </Link>
        <ToolFooter {...copy.logo} />
      </article>
    </section>
  );
}
