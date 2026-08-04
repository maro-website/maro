import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function MaroSymbol({ className }: { className?: string }) {
  return (
    <img
      src="/brand/symbol.svg"
      alt="maro"
      className={cn("h-[30px] w-[30px] select-none", className)}
      draggable={false}
    />
  );
}

function MaroLockup({ wordClassName }: { wordClassName?: string }) {
  return (
    <>
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
    </>
  );
}

function MaroWord({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-[22px] font-extrabold leading-none tracking-[-0.04em] text-ink",
        className
      )}
    >
      maro
    </span>
  );
}

export function Logo({
  className,
  wordClassName,
  symbolClassName,
  showWord = false,
  /** Mobile: full lockup (symbol + maro). Desktop: symbol only. */
  mobileLockup = false,
  /** Mobile: "maro" text only. Takes precedence over mobileLockup. */
  mobileWordOnly = false,
}: {
  className?: string;
  wordClassName?: string;
  symbolClassName?: string;
  showWord?: boolean;
  mobileLockup?: boolean;
  mobileWordOnly?: boolean;
}) {
  if (showWord) {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <MaroLockup wordClassName={wordClassName} />
      </span>
    );
  }

  if (mobileWordOnly) {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <span className="lg:hidden">
          <MaroWord className={wordClassName} />
        </span>
        <MaroSymbol className={cn("hidden lg:block", symbolClassName)} />
      </span>
    );
  }

  if (mobileLockup) {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <span className="lg:hidden">
          <MaroLockup wordClassName={cn("h-6 w-auto sm:h-7", wordClassName)} />
        </span>
        <MaroSymbol className={cn("hidden lg:block", symbolClassName)} />
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center", className)}>
      <MaroSymbol className={symbolClassName} />
    </span>
  );
}
