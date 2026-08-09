"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

// Playful loader: maro symbol at center with monochrome blue brand shapes orbiting.

function Triangle({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <polygon points="50,6 96,94 4,94" fill={color} />
    </svg>
  );
}

function Quarter({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path d="M6,6 L6,94 A88,88 0 0 0 94,6 Z" fill={color} />
    </svg>
  );
}

export function MaroShapesLoader({ className }: { className?: string }) {
  const blue = "var(--c-blue)";
  return (
    <div
      className={cn("maro-shapes relative grid place-items-center", className)}
      style={{ width: 180, height: 180 }}
      aria-label="Po gjenerohet"
      role="status"
    >
      <div style={{ animation: "maro-bob 2.6s ease-in-out infinite" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/maro-symbol.svg"
          alt=""
          width={62}
          height={62}
          className="select-none"
          draggable={false}
          style={{ animation: "maro-pop 0.6s cubic-bezier(0.22,1,0.36,1) both" }}
        />
      </div>

      <div className="pointer-events-none absolute inset-0">
        <span
          className="absolute left-3 top-4"
          style={{ animation: "maro-drift 4.5s ease-in-out infinite" }}
        >
          <span className="block" style={{ animation: "maro-spin 7s linear infinite" }}>
            <Triangle size={26} color={blue} />
          </span>
        </span>

        <span
          className="absolute right-4 top-6 block h-5 w-5 rounded-full"
          style={{ background: blue, animation: "maro-bob 3.1s ease-in-out infinite", opacity: 0.7 }}
        />

        <span
          className="absolute bottom-5 left-6"
          style={{ animation: "maro-spin-rev 6s linear infinite" }}
        >
          <Quarter size={24} color={blue} />
        </span>

        <span
          className="absolute bottom-6 right-7 block h-3.5 w-3.5 rounded-full"
          style={{ background: blue, animation: "maro-drift 3.6s ease-in-out infinite", opacity: 0.5 }}
        />

        <span
          className="absolute left-1/2 top-1/2 block h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-[3px]"
          style={{ background: blue, opacity: 0.35, ["--orbit" as string]: "62px", animation: "maro-orbit 5s linear infinite" }}
        />
      </div>
    </div>
  );
}
