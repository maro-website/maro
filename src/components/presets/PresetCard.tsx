"use client";

import * as React from "react";
import { Crown, Heart, ImageIcon, Sparkles } from "lucide-react";
import type { PromptItem } from "@/lib/prompts/types";
import type { PresetTool } from "@/lib/presets/model";
import { cn } from "@/lib/utils/cn";

type Props = {
  item: PromptItem;
  liked: boolean;
  onOpen: () => void;
  onLike: () => void;
  onUse: () => void;
};

const ASPECT: Record<PresetTool, string> = {
  imazh: "aspect-[4/5]",
  logo: "aspect-square",
  web: "aspect-video",
};

function PresetCardFoundation({ item, liked, onOpen, onLike, onUse }: Props) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-line bg-surface transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lg">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className={cn("relative overflow-hidden bg-surface-2", ASPECT[item.tool])}>
          {item.featured_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.featured_url} alt={`${item.title} preset preview`} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
          ) : (
            <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(37,63,218,.14),transparent_55%)] text-ink-3">
              {item.tool === "logo" ? <Sparkles className="h-8 w-8" /> : <ImageIcon className="h-8 w-8" />}
            </div>
          )}
          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-scrim px-2.5 py-1 text-[11px] font-bold text-on-scrim backdrop-blur">{item.category}</span>
            {item.featured && <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-brand-fg">Featured</span>}
            {item.access_level === "premium" && <span className="inline-flex items-center gap-1 rounded-full bg-[#17130b]/85 px-2.5 py-1 text-[11px] font-bold text-[#ffd978]"><Crown className="h-3 w-3" /> Premium</span>}
          </div>
        </div>
      </button>
      <div className="p-3.5">
        <div className="flex items-start gap-2">
          <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
            <h3 className="truncate text-[15px] font-extrabold text-ink">{item.title}</h3>
            {item.description && <p className="mt-1 line-clamp-2 text-[12.5px] leading-5 text-ink-3">{item.description}</p>}
          </button>
          <button type="button" onClick={onLike} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-3 hover:text-[#e83f64]" aria-label={liked ? "Hiqe nga të preferuarat" : "Ruaje te të preferuarat"}>
            <Heart className={cn("h-4 w-4", liked && "fill-current text-[#e83f64]")} />
          </button>
        </div>
        <button type="button" onClick={onUse} className="mt-3 w-full rounded-xl bg-ink px-3 py-2.5 text-[13px] font-bold text-canvas transition hover:opacity-90">Përdor presetin</button>
      </div>
    </article>
  );
}

export function ImagePresetCard(props: Props) { return <PresetCardFoundation {...props} />; }
export function LogoPresetCard(props: Props) { return <PresetCardFoundation {...props} />; }
export function WebPresetCard(props: Props) { return <PresetCardFoundation {...props} />; }

export function PresetCard(props: Props) {
  if (props.item.tool === "logo") return <LogoPresetCard {...props} />;
  if (props.item.tool === "web") return <WebPresetCard {...props} />;
  return <ImagePresetCard {...props} />;
}
