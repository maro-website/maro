"use client";

import * as React from "react";
import type { InspirationItem } from "@/lib/modules/imazh/inspiration";
import { MARO_IMAGE_URL_MIME } from "@/lib/modules/imazh/inspiration";
import { cn } from "@/lib/utils/cn";

export function InspirationCarousel({ items }: { items: InspirationItem[] }) {
  const [paused, setPaused] = React.useState(false);
  const doubled = [...items, ...items];

  const onDragStart = (e: React.DragEvent, url: string) => {
    e.dataTransfer.setData(MARO_IMAGE_URL_MIME, url);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      className="relative w-full overflow-hidden pb-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className={cn(
          "flex w-max gap-[25px] px-4 motion-reduce:animate-none",
          !paused && "animate-hub-carousel"
        )}
      >
        {doubled.map((item, i) => (
          <div
            key={`${item.id}-${i}`}
            draggable
            onDragStart={(e) => onDragStart(e, item.imageUrl)}
            className="group relative h-[314px] w-[231px] shrink-0 cursor-grab overflow-hidden rounded-maro16 border border-line bg-surface active:cursor-grabbing"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt={item.label ?? item.category ?? "Inspirim"}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              draggable={false}
            />
            {item.category && (
              <span className="absolute right-2 top-2 rounded-md bg-brand px-2 py-0.5 text-[11px] font-bold text-white">
                {item.category}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
