"use client";

import * as React from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Shared image renderer for persisted Maro media with one automatic retry. */
export function StableImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  const reported = React.useRef(false);
  React.useEffect(() => { setFailed(false); reported.current = false; }, [src]);

  if (failed) {
    return <span className={cn("grid h-full w-full place-items-center bg-surface-2 text-ink-3", className)} role="img" aria-label={alt || "Imazhi nuk u ngarkua"}><ImageIcon className="h-5 w-5" /></span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} loading="lazy" onError={() => {
      if (!reported.current) {
        reported.current = true;
        window.dispatchEvent(new Event("maro:asset-error"));
        window.setTimeout(() => setFailed(true), 1200);
      } else setFailed(true);
    }} />
  );
}
