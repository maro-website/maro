"use client";

import * as React from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Shared image renderer for persisted Maro media with one automatic retry. */
export function StableImage({
  src,
  alt,
  className,
  refreshKey,
  onRefresh,
  onTerminalError,
}: {
  src: string;
  alt: string;
  className?: string;
  /** Stable canonical identity; signed URL changes must not reset retry count. */
  refreshKey?: string;
  onRefresh?: () => Promise<boolean>;
  onTerminalError?: () => void;
}) {
  const [failed, setFailed] = React.useState(false);
  const reported = React.useRef(false);
  const refreshAttempts = React.useRef(0);
  const retryIdentity = refreshKey ?? src;
  React.useEffect(() => { setFailed(false); reported.current = false; }, [src]);
  React.useEffect(() => { refreshAttempts.current = 0; }, [retryIdentity]);

  const fail = () => {
    setFailed(true);
    onTerminalError?.();
  };

  if (failed) {
    return <span className={cn("grid h-full w-full place-items-center bg-surface-2 text-ink-3", className)} role="img" aria-label={alt || "Imazhi nuk u ngarkua"}><ImageIcon className="h-5 w-5" /></span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} loading="lazy" onError={() => {
      if (!reported.current) {
        reported.current = true;
        if (onRefresh && refreshAttempts.current < 1) {
          refreshAttempts.current += 1;
          void onRefresh().then((refreshed) => {
            if (!refreshed) fail();
          }).catch(fail);
          return;
        }
        window.dispatchEvent(new Event("maro:asset-error"));
        window.setTimeout(fail, 1200);
      } else fail();
    }} />
  );
}
