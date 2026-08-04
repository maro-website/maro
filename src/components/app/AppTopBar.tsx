"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { NotificationBell } from "@/components/app/NotificationBell";
import { AppUserMenu } from "@/components/app/AppUserMenu";
import { MaroIcon } from "@/components/app/OptionIcon";
import { useMaro } from "@/context/store";
import { Menu, Coins, Plus } from "lucide-react";

export function AppTopBar({
  onOpenDrawer,
  showMenu = true,
}: {
  onOpenDrawer?: () => void;
  showMenu?: boolean;
}) {
  const { user, credits } = useMaro();

  return (
    <header className="z-30 flex shrink-0 items-center justify-between gap-3 border-b border-line bg-canvas/90 px-4 py-2.5 backdrop-blur sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        {showMenu && onOpenDrawer && (
          <button
            type="button"
            onClick={onOpenDrawer}
            className="grid h-11 w-11 min-w-[44px] place-items-center rounded-xl bg-surface text-ink lg:hidden"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <Link href="/" className="shrink-0" aria-label="maro">
          <Logo showWord className="hidden sm:inline-flex" />
          <Logo mobileWordOnly className="sm:hidden" />
        </Link>
        {user && (
          <span className="hidden lg:inline-flex">
            <NotificationBell />
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {user ? (
          <>
            <Link
              href="/credits"
              className="hidden items-center gap-1.5 rounded-full bg-surface px-3 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-2 lg:inline-flex"
            >
              <MaroIcon name="coins" fallback={Coins} className="h-4 w-4" />
              <span>{credits}</span>
              <span className="text-ink-3">kredite</span>
            </Link>
            <Link
              href="/credits"
              className="hidden h-11 w-11 min-w-[44px] place-items-center rounded-xl bg-accent-teal text-generate-fg transition-opacity hover:opacity-90 lg:grid"
              aria-label="Shto kredite"
            >
              <MaroIcon name="wallet" className="h-4 w-4" />
            </Link>
            <span className="lg:hidden">
              <NotificationBell />
            </span>
          </>
        ) : (
          <Link
            href="/credits"
            className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1.5 text-[13px] font-semibold text-ink lg:hidden"
          >
            <Coins className="h-4 w-4 shrink-0" />
            <span>0</span>
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand text-brand-fg">
              <Plus className="h-3 w-3" />
            </span>
          </Link>
        )}
        <AppUserMenu />
      </div>
    </header>
  );
}
