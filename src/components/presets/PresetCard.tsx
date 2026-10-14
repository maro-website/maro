"use client";
import * as React from "react";
import { ArrowUpRight, Crown, Heart } from "lucide-react";
import { StableImage } from "@/components/app/StableImage";
import type { PromptItem } from "@/lib/prompts/types";
import type { PresetTool } from "@/lib/presets/model";
import { cn } from "@/lib/utils/cn";
import "./presets.css";

type Props = { item: PromptItem; liked: boolean; onOpen: () => void; onLike: () => void; onUse: () => void };
const ASPECT: Record<PresetTool, string> = { imazh: "aspect-[4/5]", logo: "aspect-square", web: "aspect-video" };
function PresetCardFoundation({ item, liked, onOpen, onLike, onUse }: Props) {
  return <article className="preset-card" data-tool={item.tool}>
    <div className="preset-card-artwork">
      <button type="button" onClick={onOpen} className={cn("preset-card-preview", ASPECT[item.tool])} aria-label={`Shiko presetin ${item.title}`}><StableImage src={item.featured_url} module={item.tool} alt={item.title} className="h-full w-full object-cover" /><span className="preset-card-reveal"><span>Shiko presetin <ArrowUpRight className="h-4 w-4" /></span></span></button>
      <div className="preset-card-badges"><span>{item.category}</span>{item.access_level === "premium" && <span><Crown className="h-3 w-3" /> Premium</span>}</div>
      <button type="button" onClick={onLike} className="preset-card-heart" aria-label={liked ? `Hiqe ${item.title} nga të preferuarat` : `Ruaje ${item.title} te të preferuarat`} aria-pressed={liked}><Heart className={cn("h-5 w-5", liked && "fill-current")} /></button>
    </div>
    <div className="preset-card-info"><button type="button" onClick={onOpen} className="preset-card-title"><h3>{item.title}</h3>{item.description && <p>{item.description}</p>}</button><button type="button" onClick={onUse} className="preset-card-open" aria-label={`Shiko dhe përdor ${item.title}`}><ArrowUpRight className="h-5 w-5" /></button></div>
  </article>;
}
export function ImagePresetCard(props: Props) { return <PresetCardFoundation {...props} />; }
export function LogoPresetCard(props: Props) { return <PresetCardFoundation {...props} />; }
export function WebPresetCard(props: Props) { return <PresetCardFoundation {...props} />; }
export function PresetCard(props: Props) { return <PresetCardFoundation {...props} />; }
