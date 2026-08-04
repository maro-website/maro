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

function MaroTextLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/maro-logo-textonly.svg"
      alt="maro"
      className={cn("maro-text-logo h-[22px] w-auto select-none sm:h-6", className)}
      draggable={false}
    />
  );
}

export function Logo({
  className,
  wordClassName,
  symbolClassName,
  showWord = false,
  /** Mobile: full lockup (symbol + maro). Desktop: symbol only. */
  mobileLockup = false,
  /** Mobile: text-only SVG wordmark. Takes precedence over mobileLockup. */
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
          <MaroTextLogo className={wordClassName} />
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
