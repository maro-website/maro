"use client";

import * as React from "react";
import { GenerationCard, type GenerationCardMessage } from "@/components/app/GenerationCard";
import type { ImageCreation } from "@/lib/types";

export function GalleryMasonry({
  messages,
  onOpen,
  onMarkArea,
}: {
  messages: GenerationCardMessage[];
  onOpen?: (c: ImageCreation) => void;
  onMarkArea?: (preview: string, reference: string) => void;
}) {
  return (
    <div className="flex flex-col gap-10">
      {messages.map((message) => (
        <GenerationCard key={message.id} message={message} onOpen={onOpen} onMarkArea={onMarkArea} />
      ))}
    </div>
  );
}
