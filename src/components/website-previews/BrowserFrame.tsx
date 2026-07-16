import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function BrowserFrame({
  url = "maro.al",
  children,
  className,
  compact = false,
}: {
  url?: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-pop",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b border-line bg-surface-2 px-3.5",
          compact ? "h-8" : "h-10"
        )}
      >
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-auto flex h-6 max-w-[280px] flex-1 items-center justify-center gap-1.5 rounded-md bg-surface px-3 text-[11px] font-medium text-ink-3">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 1 1 8 0v3" />
          </svg>
          {url}
        </div>
      </div>
      {children}
    </div>
  );
}
