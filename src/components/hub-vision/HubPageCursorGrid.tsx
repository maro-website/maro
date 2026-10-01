"use client";

import { useEffect, useState } from "react";
import CursorGrid, { type CursorGridProps } from "./CursorGrid";
import s from "./HubVision.module.css";

/** Set to false to remove full-page CursorGrid on the hub. */
/** Hidden for now — set true to restore full-page CursorGrid. */
export const HUB_CURSOR_GRID_ENABLED = false;

const HUB_PAGE_CURSOR_GRID: CursorGridProps = {
  cellSize: 70,
  color: "#00ff72",
  radius: 140,
  falloff: "smooth",
  holdTime: 400,
  fadeDuration: 800,
  lineWidth: 1.2,
  maxOpacity: 1,
  fillOpacity: 0,
  gridOpacity: 0.045,
  cellRadius: 0,
  clickPulse: true,
  pulseSpeed: 600,
  globalPointer: true,
};

export function HubPageCursorGrid() {
  const [motionOk, setMotionOk] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionOk(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!HUB_CURSOR_GRID_ENABLED || !motionOk) return null;

  return <CursorGrid className={s.hubPageCursorGridCanvas} {...HUB_PAGE_CURSOR_GRID} />;
}
