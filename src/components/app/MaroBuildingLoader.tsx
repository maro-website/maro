"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** Small centered maro symbol with gentle bob — used inside generation image box. */
export function MaroBuildingLoader({
  className,
  size = 48,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div className={cn("grid place-items-center", className)} role="status" aria-label="Po gjenerohet">
      <div style={{ animation: "maro-bob 2.4s ease-in-out infinite" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/maro-symbol.svg"
          alt=""
          width={size}
          height={size}
          className="select-none opacity-90"
          draggable={false}
          style={{ animation: "maro-pop 0.5s cubic-bezier(0.22,1,0.36,1) both" }}
        />
      </div>
    </div>
  );
}

/** Tiny spinning symbol for "maro pe maron" status line. */
export function MaroBuildingSpinner({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/maro-symbol.svg"
      alt=""
      className={cn("h-4 w-4 select-none", className)}
      draggable={false}
      style={{ animation: "maro-build-spin 2s linear infinite" }}
    />
  );
}
