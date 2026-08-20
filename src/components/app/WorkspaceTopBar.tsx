"use client";

import Link from "next/link";
import { AppUserMenu } from "@/components/app/AppUserMenu";
import { MaroIcon } from "@/components/app/OptionIcon";
import { useMaro } from "@/context/store";
import { Coins } from "lucide-react";

/** Desktop workspace header — credits + wallet + profile (top-right of canvas). */
export function WorkspaceTopBar() {
  const { user, credits } = useMaro();

  if (!user) {
    return (
      <div className="flex shrink-0 items-center justify-end gap-3 px-6 py-5">
        <AppUserMenu />
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center justify-end gap-2.5 px-6 py-5">
      <Link
        href="/pricing"
        className="inline-flex h-11 items-center gap-2 rounded-full bg-topbar-credits px-4 text-[15px] font-semibold transition-opacity hover:opacity-90"
      >
        <MaroIcon name="coins" fallback={Coins} className="h-5 w-5 text-brand" />
        <span className="tabular-nums text-topbar-credits">{credits}</span>
        <span className="text-topbar-credits-muted">kredite</span>
      </Link>
      <Link
        href="/pricing"
        className="grid h-11 w-11 place-items-center rounded-maro12 bg-topbar-wallet transition-opacity hover:opacity-90"
        aria-label="Shto kredite"
      >
        <MaroIcon name="wallet" className="h-5 w-5 text-ink" />
      </Link>
      <AppUserMenu />
    </div>
  );
}
