"use client";

import { Moon } from "lucide-react";
import { StableImage } from "@/components/app/StableImage";
import type { Mood } from "@/lib/moods/model";
import { cn } from "@/lib/utils/cn";

export function MoodCover({ mood, className }: { mood?: Pick<Mood, "title" | "cover_url"> | null; className?: string }) {
  return mood?.cover_url
    ? <StableImage src={mood.cover_url} alt="" className={cn("aspect-square w-full object-cover", className)} />
    : <div className={cn("grid aspect-square place-items-center bg-surface-2 text-brand", className)}><Moon className="h-9 w-9" /></div>;
}
