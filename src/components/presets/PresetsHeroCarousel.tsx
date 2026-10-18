"use client";

import { useSyncExternalStore } from "react";
import { StableImage } from "@/components/app/StableImage";
import type { PresetTool } from "@/lib/presets/model";
import CircularCarousel from "./CircularCarousel";

const desktopQuery = "(min-width: 1024px)";
const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const isDesktop = () => window.matchMedia(desktopQuery).matches;
const serverSnapshot = () => false;

type HeroItem = { id: string; src: string; alt: string; title: string; subtitle: string };

export function PresetsHeroCarousel({ items, tool, paused, onSelect }: {
  items: HeroItem[];
  tool: PresetTool;
  paused: boolean;
  onSelect: (item: { id: string }) => void;
}) {
  const desktop = useSyncExternalStore(subscribe, isDesktop, serverSnapshot);
  const aspectRatio = tool === "logo" ? 1 : 0.75;

  // Only mount the animated orbit on desktop; touch screens use native scrolling.
  if (desktop) return <CircularCarousel items={items} preset="orbit" intro="rise" cardWidth={200} aspectRatio={aspectRatio} speed={13} captions gap={6} tilt={-7} curve={0} perspective={1540} momentum={0.83} parallax={0.52} depthFade={0.85} innerShade={0.62} cornerRadius={22} fadeColor="var(--maro-color-bg-canvas)" autoplay={paused ? "off" : "drift"} onItemClick={onSelect} />;

  return <ul className="presets-hero-rail" aria-label="Presetet më të fundit">
    {items.map((item, index) => <li key={item.id}>
      <button type="button" className="presets-hero-card" aria-label={`Shiko presetin: ${item.title}`} onClick={() => onSelect(item)}>
        <span className="presets-hero-preview" style={{ aspectRatio }}><StableImage src={item.src} alt={item.alt} module={tool} loading={index < 2 ? "eager" : "lazy"} draggable={false} /></span>
        <span className="presets-hero-caption"><strong>{item.title}</strong><small>{item.subtitle}</small></span>
      </button>
    </li>)}
  </ul>;
}
