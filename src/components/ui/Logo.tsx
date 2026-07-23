import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function MaroSymbol({ className }: { className?: string }) {
  // Brand mark (multi-color geometric symbol), sized via className.
  return (
    <img
      src="/brand/symbol.svg"
      alt="maro"
      className={cn("h-[30px] w-[30px] select-none", className)}
      draggable={false}
    />
  );
}

export function Logo({
  className,
  wordClassName,
  symbolClassName,
  showWord = false,
}: {
  className?: string;
  wordClassName?: string;
  symbolClassName?: string;
  showWord?: boolean;
}) {
  if (!showWord) {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <MaroSymbol className={symbolClassName} />
      </span>
    );
  }

  // Full lockup (symbol + "maro" wordmark). The wordmark is dark on light
  // backgrounds and switches to white only on the full-dark ("mono") theme.
  return (
    <span className={cn("inline-flex items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-black.svg"
        alt="maro"
        className={cn("logo-lockup-light h-7 w-auto select-none", wordClassName)}
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-white.svg"
        alt="maro"
        className={cn("logo-lockup-dark h-7 w-auto select-none", wordClassName)}
        draggable={false}
      />
    </span>
  );
}
