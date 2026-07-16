import * as React from "react";
import type { StyleKey } from "@/lib/types";

// Tiny distinct visual per style — never the same mock with a different label.
export function StyleThumb({ style }: { style: StyleKey }) {
  const base = "h-full w-full p-3 flex flex-col";
  switch (style) {
    case "minimal":
      return (
        <div className={base} style={{ background: "#fff" }}>
          <div className="h-1.5 w-8 rounded-full bg-ink/80" />
          <div className="mt-auto space-y-1.5">
            <div className="h-2 w-3/4 rounded bg-ink/80" />
            <div className="h-1.5 w-1/2 rounded bg-ink/25" />
          </div>
        </div>
      );
    case "premium":
      return (
        <div className={base} style={{ background: "#0e0e12" }}>
          <div className="h-1.5 w-6 rounded-full bg-white/50" />
          <div className="mt-auto space-y-1.5">
            <div className="h-2.5 w-4/5 rounded bg-white" style={{ fontFamily: "serif" }} />
            <div className="h-4 w-14 rounded-sm bg-[#c9a15e]" />
          </div>
        </div>
      );
    case "bold":
      return (
        <div className={base} style={{ background: "#ea580c" }}>
          <div className="mt-1 space-y-1">
            <div className="h-3 w-full rounded-none bg-black" />
            <div className="h-3 w-2/3 rounded-none bg-black" />
          </div>
          <div className="mt-auto h-5 w-16 rounded-none bg-black" />
        </div>
      );
    case "editorial":
      return (
        <div className={base} style={{ background: "#faf6f0" }}>
          <div className="flex gap-2">
            <div className="h-full w-1/2 space-y-1">
              <div className="h-2.5 w-full rounded bg-[#2a2018]" />
              <div className="h-1.5 w-4/5 rounded bg-[#2a2018]/40" />
            </div>
            <div className="h-full w-1/2 rounded bg-[#8a5a2b]/70" />
          </div>
        </div>
      );
    case "modern":
      return (
        <div className={base} style={{ background: "#fff" }}>
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded-lg bg-brand" />
            <div className="h-1.5 w-10 rounded-full bg-ink/20" />
          </div>
          <div className="mt-auto grid grid-cols-3 gap-1">
            <div className="h-5 rounded-lg bg-brand/15" />
            <div className="h-5 rounded-lg bg-brand/15" />
            <div className="h-5 rounded-lg bg-brand/15" />
          </div>
        </div>
      );
    case "playful":
      return (
        <div className={base} style={{ background: "#0ea5b7" }}>
          <div className="flex gap-1">
            <div className="h-4 w-4 rounded-full bg-yellow-300" />
            <div className="h-4 w-4 rounded-full bg-white" />
          </div>
          <div className="mt-auto space-y-1.5">
            <div className="h-2.5 w-3/4 rounded-full bg-white" />
            <div className="h-4 w-16 rounded-full bg-yellow-300" />
          </div>
        </div>
      );
    default:
      return (
        <div className={base} style={{ background: "linear-gradient(135deg,#5a28e5,#8b5cf6)" }}>
          <div className="m-auto text-center text-[10px] font-bold uppercase tracking-widest text-white/90">
            Auto
          </div>
        </div>
      );
  }
}
