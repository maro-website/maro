"use client";

import { useEffect, useState } from "react";
import ColorBends, { type ColorBendsProps } from "./ColorBends";
import s from "./HubVision.module.css";

const HUB_COLOR_BENDS: ColorBendsProps = {
  colors: ["#00ff72", "#00e668", "#00cc5e"],
  rotation: -7,
  speed: 0.2,
  scale: 0.9,
  frequency: 1.2,
  warpStrength: 0.91,
  mouseInfluence: 1.6,
  noise: 0.22,
  parallax: 1,
  iterations: 1,
  intensity: 1.05,
  bandWidth: 5.2,
  transparent: true,
  autoRotate: -2,
};

export function HubHeroColorBends() {
  const [motionOk, setMotionOk] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionOk(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!motionOk) {
    return <div className={s.heroColorBendsFallback} aria-hidden="true" />;
  }

  return <ColorBends className={s.heroColorBendsCanvas} {...HUB_COLOR_BENDS} />;
}
