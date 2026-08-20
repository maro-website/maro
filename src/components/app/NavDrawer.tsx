"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MaroSymbol } from "@/components/ui/Logo";
import { HubDropdown } from "@/components/app/HubDropdown";
import {
  NAV_GROUP_LABELS,
  TOP_BAR_DESTINATIONS,
  HUB_MENU_DESTINATIONS,
  navDestinationsByGroup,
  isNavActive,
} from "@/lib/nav/destinations";
import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";
import type { NavGroup } from "@/lib/nav/destinations";

const GROUP_ORDER: NavGroup[] = ["home", "discover", "tools", "studio", "community", "later"];

export function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const grouped = navDestinationsByGroup();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigimi">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-overlay"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
            className="absolute inset-0 flex w-full flex-col bg-canvas"
          >
            <div className="flex h-[var(--maro-shell-header-height)] shrink-0 items-center justify-between px-4">
              <Link href="/" onClick={onClose} className="flex items-center gap-2">
                <MaroSymbol className="h-8 w-8" />
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="grid h-11 w-11 place-items-center rounded-maro12 bg-surface text-ink hover:bg-surface-hover"
                aria-label="Mbyll"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
              <div className="mb-6 px-1">
                <HubDropdown />
              </div>

              <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-ink-3">Tools</p>
              <div className="mb-5 flex flex-col gap-1">
                {TOP_BAR_DESTINATIONS.map((dest) => {
                  const active = isNavActive(pathname, dest);
                  return (
                    <Link
                      key={dest.id}
                      href={dest.route}
                      onClick={onClose}
                      className={cn(
                        "flex min-h-[52px] items-center justify-between rounded-maro16 px-4 py-3 text-[16px] font-semibold tracking-brand transition-colors",
                        active ? "bg-surface text-brand" : "text-ink hover:bg-surface"
                      )}
                    >
                      {dest.label}
                      {dest.comingSoon && (
                        <span className="text-[11px] font-medium text-ink-3">së shpejti</span>
                      )}
                    </Link>
                  );
                })}
              </div>

              <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-ink-3">Hub</p>
              <div className="mb-5 flex flex-col gap-1">
                {HUB_MENU_DESTINATIONS.filter((d) => d.id !== "hub").map((dest) =>
                  dest.disabled ? (
                    <span
                      key={dest.id}
                      className="flex min-h-[52px] items-center justify-between rounded-maro16 px-4 py-3 text-[16px] font-semibold text-ink-3"
                    >
                      {dest.label}
                      {dest.badge && <span className="text-[11px]">{dest.badge}</span>}
                    </span>
                  ) : (
                    <Link
                      key={dest.id}
                      href={dest.route}
                      onClick={onClose}
                      className={cn(
                        "flex min-h-[52px] items-center rounded-maro16 px-4 py-3 text-[16px] font-semibold tracking-brand transition-colors",
                        isNavActive(pathname, dest) ? "bg-surface text-brand" : "text-ink hover:bg-surface"
                      )}
                    >
                      {dest.label}
                    </Link>
                  )
                )}
              </div>

              {GROUP_ORDER.filter((g) => g !== "tools" && g !== "home").map((group) => {
                const items = grouped[group].filter(
                  (d) => !TOP_BAR_DESTINATIONS.some((t) => t.id === d.id)
                );
                if (!items.length) return null;
                return (
                  <div key={group} className="mb-5">
                    <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-ink-3">
                      {NAV_GROUP_LABELS[group]}
                    </p>
                    <div className="flex flex-col gap-1">
                      {items.map((dest) => {
                        const active = isNavActive(pathname, dest);
                        return (
                          <Link
                            key={dest.id}
                            href={dest.route}
                            onClick={onClose}
                            className={cn(
                              "flex min-h-[52px] items-center justify-between rounded-maro16 px-4 py-3 text-[16px] font-semibold tracking-brand transition-colors",
                              active ? "bg-surface text-brand" : "text-ink hover:bg-surface"
                            )}
                          >
                            {dest.label}
                            {dest.badge && (
                              <span className="text-[11px] font-medium text-ink-3">{dest.badge}</span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
