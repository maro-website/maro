import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function MaroSymbol({ className }: { className?: string }) {
  // Brand mark, sized via className (default 34px square).
  return (
    <img
      src="/brand/symbol.svg"
      alt="Maro"
      className={cn("h-[34px] w-[34px] select-none", className)}
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
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <MaroSymbol className={symbolClassName} />
      {showWord && (
        <span
          className={cn(
            "text-[22px] font-extrabold tracking-[-0.04em] text-ink",
            wordClassName
          )}
        >
          maro
        </span>
      )}
    </span>
  );
}
