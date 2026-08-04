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
    <div className="flex shrink-0 items-center justify-end gap-3 px-6 py-5">
      <Link
        href="/credits"
        className="inline-flex h-12 items-center gap-2.5 rounded-2xl bg-surface-2 px-5 text-[16px] font-semibold text-ink transition-colors hover:bg-line"
      >
        <MaroIcon name="coins" fallback={Coins} className="h-5 w-5" />
        <span>{credits}</span>
        <span className="text-ink-3">kredite</span>
      </Link>
      <Link
        href="/credits"
        className="maro-icon-btn bg-accent-teal text-generate-fg transition-opacity hover:opacity-90"
        aria-label="Shto kredite"
      >
        <MaroIcon name="wallet" className="h-5 w-5" />
      </Link>
      <AppUserMenu />
    </div>
  );
}
