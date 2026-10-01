"use client";

import * as React from "react";
import type { InspirationItem } from "@/lib/modules/imazh/inspiration";
import {
  MARO_IMAGE_URL_MIME,
  MARO_PRESET_MIME,
  presetAttachFromItem,
} from "@/lib/modules/imazh/inspiration";
import type { PromptAttach } from "@/lib/prompts/types";
import { cn } from "@/lib/utils/cn";

/** Full-width auto-scrolling preset/inspiration strip — 1:1 tiles, no pause on hover. */
export function InspirationCarousel({
  items,
  activePresetId,
  onPresetSelect,
}: {
  items: InspirationItem[];
  activePresetId?: string | null;
  onPresetSelect?: (attach: PromptAttach) => void;
}) {
  const doubled = [...items, ...items];

  const onDragStart = (e: React.DragEvent, item: InspirationItem) => {
    if (item.imageUrl) {
      e.dataTransfer.setData(MARO_IMAGE_URL_MIME, item.imageUrl);
    }
    const attach = presetAttachFromItem(item);
    if (attach) {
      e.dataTransfer.setData(MARO_PRESET_MIME, JSON.stringify(attach));
    }
    e.dataTransfer.effectAllowed = "copy";
  };

  const onItemClick = (item: InspirationItem) => {
    const attach = presetAttachFromItem(item);
    if (attach && onPresetSelect) {
      onPresetSelect(attach);
    }
  };

  return (
    <div className="relative -mx-4 w-[calc(100%+2rem)] overflow-hidden pb-8 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:pb-10 lg:-mx-[max(1.5rem,calc((100vw-100%)/2))] lg:w-screen lg:max-w-[100vw]">
      <div className="flex w-max animate-hub-carousel gap-[var(--carousel-gap)] px-4 motion-reduce:animate-none sm:px-6">
        {doubled.map((item, i) => {
          const isActive = Boolean(activePresetId && item.preset?.id === activePresetId);
          return (
            <button
              key={`${item.id}-${i}`}
              type="button"
              draggable
              onClick={() => onItemClick(item)}
              onDragStart={(e) => onDragStart(e, item)}
              className={cn(
                "group relative h-[var(--carousel-card-h)] w-[var(--carousel-card-w)] shrink-0 cursor-grab overflow-hidden rounded-maro16 bg-surface text-left active:cursor-grabbing",
                isActive && "opacity-70"
              )}
              aria-pressed={isActive || undefined}
              aria-label={item.preset ? `maroPreset ${item.preset.code}` : item.label ?? item.category ?? "Inspirim"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt=""
                className="aspect-square h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                draggable={false}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
