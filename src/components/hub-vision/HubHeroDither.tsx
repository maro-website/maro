"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { DitherProps } from "./Dither";
import s from "./HubVision.module.css";

const Dither = dynamic(() => import("./Dither"), { ssr: false });

export const HUB_HERO_DITHER_ENABLED = true;

const HUB_DITHER: DitherProps = {
  waveColor: [0, 1, 0.4470588235294118],
  backgroundColor: [0.13725490196078433, 0.13725490196078433, 0.13725490196078433],
  disableAnimation: false,
  enableMouseInteraction: false,
  mouseRadius: 1.3,
  colorNum: 8.8,
  waveAmplitude: 0,
  waveFrequency: 4.9,
  waveSpeed: 0.09,
};

export function HubHeroDither() {
  const [motionOk, setMotionOk] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionOk(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!HUB_HERO_DITHER_ENABLED) return null;

  if (!motionOk) {
    return <div className={s.hubHeroDitherFallback} aria-hidden="true" />;
  }

  return <Dither className={s.hubHeroDitherCanvas} {...HUB_DITHER} />;
}
