"use client";

import * as React from "react";
import { motion } from "framer-motion";
import type { GenerationCardMessage } from "@/components/app/GenerationCard";
import { MaroBuildingLoader } from "@/components/app/MaroBuildingLoader";
import { resolveAspectBox } from "@/lib/design/aspectRatio";
import type { ImageCreation } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export function GalleryMasonry({
  messages,
  onOpen,
}: {
  messages: GenerationCardMessage[];
  onOpen?: (c: ImageCreation) => void;
}) {
  return (
    <div className="columns-2 gap-3 sm:columns-3 lg:gap-4">
      {messages.map((m) => {
        const url = m.creation?.urls[0];
        const { ratio, maxW } = resolveAspectBox(m.format, m.size ?? m.creation?.size);
        return (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 break-inside-avoid lg:mb-4"
          >
            <div
              className="relative overflow-hidden rounded-maro16 border border-line bg-surface"
              style={{ aspectRatio: ratio, maxWidth: maxW }}
            >
              {m.status === "thinking" && (
                <div className="absolute inset-0 grid place-items-center">
                  <MaroBuildingLoader size={36} />
                </div>
              )}
              {m.status === "error" && (
                <div className="flex h-full min-h-[120px] items-center justify-center p-3 text-center text-[13px] text-danger">
                  {m.error || "Gabim"}
                </div>
              )}
              {m.status === "done" && url && (
                <button
                  type="button"
                  onClick={() => m.creation && onOpen?.(m.creation)}
                  className="group block h-full w-full"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                  />
                </button>
              )}
              {m.status === "done" && !url && (
                <div className="grid h-full min-h-[120px] place-items-center text-[13px] text-ink-3">
                  Pa imazh
                </div>
              )}
            </div>
            {m.text && (
              <p className={cn("mt-1.5 line-clamp-2 px-0.5 text-[12px] text-ink-3")}>{m.text}</p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
