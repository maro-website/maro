"use client";

import { copy } from "./content";
import { ToolFooter } from "./ToolFooter";
import s from "./HubVision.module.css";

const LOGO_VIDEO_SRC = "/videos/hub-vision/maroLogo-videohero01.mp4";
const IMAZH_HERO_SRC = "/images/hub-vision/maroimazh-hero01.png";

export function Launchpad() {
  return (
    <section className={s.launchpad} aria-label="Fillo të krijosh">
      <article className={s.imageDoor}>
        <div className={s.imazhHeroCanvas} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={s.imazhHeroImage} src={IMAZH_HERO_SRC} alt="" />
        </div>
        <ToolFooter {...copy.imazh} />
      </article>
      <article className={s.logoDoor}>
        <div className={s.logoVideoCanvas} aria-hidden="true">
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
        </div>
        <ToolFooter {...copy.logo} />
      </article>
    </section>
  );
}
