"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { NotificationBell } from "@/components/app/NotificationBell";
import { AppUserMenu } from "@/components/app/AppUserMenu";
import { MaroIcon } from "@/components/app/OptionIcon";
import { useMaro } from "@/context/store";
import { TOP_BAR_DESTINATIONS, isNavActive } from "@/lib/nav/destinations";
import { cn } from "@/lib/utils/cn";
import { Coins, Menu } from "lucide-react";

export function AppTopNav({ onOpenDrawer }: { onOpenDrawer?: () => void }) {
  const pathname = usePathname();
  const { user, credits } = useMaro();

  return (
    <header className="z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        {onOpenDrawer && (
          <button
            type="button"
            onClick={onOpenDrawer}
            className="maro-icon-btn shrink-0 border border-line bg-surface text-ink lg:hidden"
            aria-label="Menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
        <Link href="/" className="shrink-0" aria-label="maro">
          <Logo showWord wordClassName="h-6 w-auto max-lg:hidden" />
          <span className="lg:hidden">
            <Logo mobileWordOnly />
          </span>
        </Link>
      </div>

      <nav
        className="scroll-thin hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto lg:flex"
        aria-label="Navigimi kryesor"
      >
        {TOP_BAR_DESTINATIONS.map((dest) => {
          const active = isNavActive(pathname, dest);
          const disabled = dest.comingSoon;
          return (
            <Link
              key={dest.id}
              href={disabled ? dest.route : dest.route}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[14px] font-semibold tracking-brand transition-colors",
                active
                  ? "bg-ink text-white"
                  : disabled
                  ? "text-ink-3"
                  : "text-ink-2 hover:bg-canvas hover:text-ink"
              )}
              aria-current={active ? "page" : undefined}
            >
              {dest.label}
              {dest.badge && (
                <span className="rounded-full bg-canvas px-1.5 py-0.5 text-[10px] font-bold text-ink-3">
                  {dest.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {user && (
          <Link
            href="/pricing"
            className="hidden items-center gap-2 rounded-full border border-line bg-topbar-credits px-3 py-2 text-[14px] font-semibold transition-opacity hover:opacity-90 sm:inline-flex"
          >
            <MaroIcon name="coins" fallback={Coins} className="h-4 w-4 text-brand" />
            <span className="tabular-nums text-topbar-credits">{credits}</span>
            <span className="text-topbar-credits-muted">kredite</span>
          </Link>
        )}
        <NotificationBell />
        <AppUserMenu />
      </div>
    </header>
  );
}
