"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaroSymbol } from "@/components/ui/Logo";
import { NotificationBell } from "@/components/app/NotificationBell";
import { AppUserMenu } from "@/components/app/AppUserMenu";
import { HubDropdown } from "@/components/app/HubDropdown";
import { MaroIcon, ToolIcon } from "@/components/app/OptionIcon";
import { useMaro } from "@/context/store";
import { TOP_BAR_DESTINATIONS, isNavActive } from "@/lib/nav/destinations";
import { iconSrc } from "@/lib/tools/iconMap";
import { cn } from "@/lib/utils/cn";
import { Coins, Menu, Megaphone } from "lucide-react";

function ModuleNavIcon({
  dest,
  active,
}: {
  dest: (typeof TOP_BAR_DESTINATIONS)[number];
  active: boolean;
}) {
  const cls = cn("h-5 w-5 shrink-0", active ? "text-brand" : "text-ink");
  if (dest.toolId) {
    return <ToolIcon toolId={dest.toolId} fallback={Megaphone} className={cls} />;
  }
  if (dest.iconName) {
    return <MaroIcon src={iconSrc(`${dest.iconName}.svg`)} fallback={Megaphone} className={cls} />;
  }
  return null;
}

export function AppTopNav({ onOpenDrawer }: { onOpenDrawer?: () => void }) {
  const pathname = usePathname();
  const { user, credits } = useMaro();
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const hubActive = pathname === "/";

  const itemIsActive = React.useCallback(
    (index: number) =>
      index === 0
        ? hubActive
        : isNavActive(pathname, TOP_BAR_DESTINATIONS[index - 1]!),
    [hubActive, pathname]
  );

  const showDividerBefore = (index: number) => {
    const previous = index - 1;
    return !(
      itemIsActive(previous) ||
      itemIsActive(index) ||
      hoveredIndex === previous ||
      hoveredIndex === index
    );
  };

  return (
    <header className="z-30 flex h-[var(--maro-shell-header-height)] shrink-0 items-center gap-3 bg-canvas px-3 sm:px-4 lg:gap-[var(--nav-gap)] lg:px-[30px]">
      <div className="flex min-w-0 items-center gap-2 lg:gap-[var(--nav-gap)]">
        {onOpenDrawer && (
          <button
            type="button"
            onClick={onOpenDrawer}
            className="maro-icon-button shrink-0 bg-surface lg:hidden"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <Link href="/" className="shrink-0" aria-label="maro">
          <MaroSymbol className="h-8 w-8 lg:h-10 lg:w-10" />
        </Link>
      </div>

      <nav
        className="maro-nav scroll-thin hidden min-w-0 flex-1 overflow-x-auto py-2 lg:flex"
        aria-label="Navigimi kryesor"
        onPointerLeave={() => setHoveredIndex(null)}
      >
        <div onPointerEnter={() => setHoveredIndex(0)}>
          <HubDropdown />
        </div>
        {TOP_BAR_DESTINATIONS.map((dest, i) => {
          const active = isNavActive(pathname, dest);
          const navIndex = i + 1;

          return (
            <React.Fragment key={dest.id}>
              <span
                className="maro-nav__sep"
                data-hidden={!showDividerBefore(navIndex) || undefined}
                aria-hidden
              />
              <Link
                href={dest.route}
                className="maro-nav__link"
                onPointerEnter={() => setHoveredIndex(navIndex)}
                data-active={active || undefined}
                data-disabled={dest.comingSoon || undefined}
                aria-current={active ? "page" : undefined}
              >
                <ModuleNavIcon dest={dest} active={active} />
                {dest.label}
              </Link>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-[10px]">
        {user && (
          <Link
            href="/pricing"
            className="inline-flex h-11 items-center justify-center gap-[10px] rounded-maro16 bg-surface px-5 text-[13px] font-semibold transition-colors hover:bg-surface-hover sm:text-[14px]"
            aria-label={`${credits} kredite`}
          >
            <MaroIcon name="coins" fallback={Coins} className="h-4 w-4 text-brand" />
            <span className="tabular-nums text-brand">{credits.toLocaleString("de-DE")}</span>
            <span className="hidden text-ink-2 sm:inline">kredite</span>
          </Link>
        )}
        <NotificationBell />
        <AppUserMenu />
      </div>
    </header>
  );
}
