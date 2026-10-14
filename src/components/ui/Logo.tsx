import * as React from "react";
import { MARO_LOGO } from "@/lib/design/maro-system";
import { cn } from "@/lib/utils/cn";

export function MaroSymbol({ className }: { className?: string }) {
  return (
    <img
      src={MARO_LOGO.symbol}
      alt="maro"
      className={cn("h-[30px] w-[30px] shrink-0 object-contain select-none", className)}
      draggable={false}
    />
  );
}

/** White symbol for inverse/dark surfaces (assistant tile, footer). */
export function MaroSymbolWhite({ className }: { className?: string }) {
  return (
    <img
      src={MARO_LOGO.symbolWhite}
      alt=""
      aria-hidden
      className={cn("maro-symbol-inverse h-[30px] w-[30px] shrink-0 object-contain select-none", className)}
      draggable={false}
    />
  );
}

function MaroLockup({ wordClassName }: { wordClassName?: string }) {
  return (
    <span
      role="img"
      aria-label="maro"
      className={cn("maro-logo-lockup inline-flex h-7 w-auto shrink-0 select-none", wordClassName)}
    >
      <img src={MARO_LOGO.lockup} alt="" aria-hidden className="maro-logo-on-light h-full w-full shrink-0 object-contain" draggable={false} />
      <img src={MARO_LOGO.lockupWhite} alt="" aria-hidden className="maro-logo-on-dark h-full w-full shrink-0 object-contain" draggable={false} />
    </span>
  );
}

function MaroTextLogo({ className }: { className?: string }) {
  return <MaroLockup wordClassName={cn("h-[22px] sm:h-6", className)} />;
}

export function NavigationLogo() {
  return <MaroLockup wordClassName="h-8" />;
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
