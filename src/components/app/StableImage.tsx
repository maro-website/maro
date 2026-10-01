"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { PreviewFallback, previewSource } from "./PreviewFallback";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  module?: string;
  /** Reserve geometry only for intrinsic-size media until it loads. */
  fallbackClassName?: string;
  /** Stable canonical identity; signed URL changes must not reset retry count. */
  refreshKey?: string;
  onRefresh?: () => Promise<boolean>;
  onTerminalError?: () => void;
  loading?: "eager" | "lazy";
  draggable?: boolean;
};

/** Shared preview renderer, retaining the existing bounded asset-refresh recovery. */
export function StableImage(props: Props) {
  const src = previewSource(props.src);
  const identity = props.refreshKey ?? src;
  const retry = React.useRef({ identity, attempts: 0 });
  if (retry.current.identity !== identity) retry.current = { identity, attempts: 0 };
  if (!src) return <PreviewFallback module={props.module} className={cn(props.className, props.fallbackClassName)} />;
  // Reset display state for a new URL while retaining the canonical retry budget.
  return <PreviewImage key={src} {...props} src={src} retry={retry.current} />;
}

function PreviewImage({ src, alt, className, fallbackClassName, module, onRefresh, onTerminalError, loading = "lazy", draggable, retry }: Props & {
  src: string;
  retry: { attempts: number };
}) {
  const [state, setState] = React.useState<"loading" | "ready" | "error">("loading");
  const image = React.useRef<HTMLImageElement>(null);
  const active = React.useRef(true);
  const reported = React.useRef(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => {
    active.current = true;
    if (image.current?.complete && image.current.naturalWidth > 0) setState("ready");
    return () => { active.current = false; clearTimeout(timer.current); };
  }, []);

  const fail = () => {
    if (!active.current) return;
    setState("error");
    onTerminalError?.();
  };
  const handleError = () => {
    if (reported.current) return;
    reported.current = true;
    setState("loading");
    if (retry.attempts >= 1) { fail(); return; }
    retry.attempts += 1;
    if (onRefresh) {
      void onRefresh().then((refreshed) => {
        if (!active.current) return;
        if (!refreshed) fail();
        else timer.current = setTimeout(fail, 1200);
      }).catch(fail);
    } else {
      window.dispatchEvent(new Event("maro:asset-error"));
      timer.current = setTimeout(fail, 1200);
    }
  };

  return (
    <span className={cn("relative block overflow-hidden", className, state !== "ready" && fallbackClassName)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={image} src={src} alt={alt} loading={loading} draggable={draggable} aria-hidden={state !== "ready" || undefined}
          className={cn("block w-full", fallbackClassName ? "h-auto" : "h-full", state !== "ready" && "opacity-0")}
          style={{ objectFit: "inherit", objectPosition: "inherit", maxHeight: "inherit" }}
          onLoad={() => { clearTimeout(timer.current); setState("ready"); }} onError={handleError} />
      {state !== "ready" && <PreviewFallback state={state} module={module} className="absolute inset-0" />}
    </span>
  );
}
