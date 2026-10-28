"use client";

import * as React from "react";
import { ArrowDown, Moon } from "lucide-react";
import CircularCarousel from "@/components/presets/CircularCarousel";
import { PreviewFallback } from "@/components/app/PreviewFallback";
import { Button } from "@/components/ui/Button";
import type { Mood } from "@/lib/moods/model";

export function MoodHero({ items, loading, paused, libraryId, onOpen }: {
  items: Mood[]; loading: boolean; paused: boolean; libraryId: string; onOpen: (id: string) => void;
}) {
  const [motionPaused, setMotionPaused] = React.useState(false);
  const previews = React.useMemo(() => items.filter(item => item.cover_url).slice(0, 12).map(item => ({
    id: item.id, src: item.cover_url!, alt: item.title, title: item.title, subtitle: "maroStyles",
  })), [items]);
  return <header className="moods-hero">
    <div className="moods-hero-copy"><p className="moods-eyebrow"><Moon className="h-5 w-5" /> maroStyles</p><h1>E njëjta ide.<br /><span>Krejt tjetër mood.</span></h1><p>Zgjedhe atmosferën. Shtoja idesë tënde.</p></div>
    {(loading || previews.length > 0) && <div className="moods-hero-stage">
      {loading ? <div className="moods-hero-loading" aria-label="Duke ngarkuar moods">{Array.from({ length: 5 }, (_, index) => <PreviewFallback key={index} state="loading" className="aspect-square w-full rounded-3xl" />)}</div>
        : <CircularCarousel items={previews} preset="orbit" intro="rise" cardWidth={200} aspectRatio={1} speed={10} captions gap={10} tilt={-7} curve={0} perspective={1540} momentum={0.83} parallax={0.52} depthFade={0.85} innerShade={0.62} cornerRadius={22} fadeColor="var(--maro-color-bg-canvas)" autoplay={motionPaused || paused || previews.length < 2 ? "off" : "drift"} onItemClick={(item: { id: string }) => onOpen(item.id)} ariaLabel="Zbulo atmosferat e maroStyles" />}
    </div>}
    <div className="moods-hero-footer"><a href={`#${libraryId}`} className="moods-browse-link">Gjeje mood-in tënd <ArrowDown className="h-4 w-4" /></a>{previews.length > 1 && <Button size="sm" variant="ghost" onClick={() => setMotionPaused(value => !value)} aria-pressed={motionPaused}>{motionPaused ? "Lëvizi moods" : "Ndale lëvizjen"}</Button>}</div>
  </header>;
}
