"use client";

import * as React from "react";
import { GenerationCard, type GenerationCardMessage } from "@/components/app/GenerationCard";
import type { ImageCreation } from "@/lib/types";

export function GalleryMasonry({
  messages,
  onOpen,
}: {
  messages: GenerationCardMessage[];
  onOpen?: (c: ImageCreation) => void;
}) {
  return (
    <div className="flex flex-col gap-10">
      {messages.map((message) => (
        <GenerationCard key={message.id} message={message} onOpen={onOpen} />
      ))}
    </div>
  );
}
