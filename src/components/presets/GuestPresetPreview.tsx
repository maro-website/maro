"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { StableImage } from "@/components/app/StableImage";
import { cn } from "@/lib/utils/cn";

/** Decorative repeats of public artwork; no restricted preset data is fetched. */
export function GuestPresetPreview({ previewUrl, className }: { previewUrl?: string; className?: string }) {
  return <div className={cn("relative isolate overflow-hidden rounded-maro12 bg-surface-2", className)}>
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 scale-110 blur-md opacity-40">
      {previewUrl ? <StableImage src={previewUrl} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-surface-selected" />}
    </div>
    <div className="relative flex h-full min-h-48 flex-col items-center justify-center gap-3 px-3 py-5 text-center">
      <LockKeyhole aria-hidden="true" className="h-5 w-5 text-ink-2" />
      <p className="text-sm font-semibold text-ink">Më shumë presete</p>
      <Link href="/sign-in" className="maro-button w-full" data-variant="brand" data-size="md">Hyr</Link>
      <Link href="/sign-up" className="maro-button w-full" data-variant="secondary" data-size="md">Regjistrohu</Link>
    </div>
  </div>;
}
