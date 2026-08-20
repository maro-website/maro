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
        <div className="fixed inset-0 z-[80] lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-overlay backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute inset-y-0 left-0 flex w-full max-w-[min(100vw,320px)] flex-col bg-canvas"
          >
            <div className="flex shrink-0 items-center justify-between px-5 py-4">
              <Link href="/" onClick={onClose} className="flex items-center gap-2">
                <MaroSymbol className="h-8 w-8" />
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="grid h-10 w-10 place-items-center rounded-xl text-ink-3 hover:bg-surface"
                aria-label="Mbyll"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 pb-6">
              <div className="mb-4 px-1">
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
                        "flex items-center justify-between rounded-xl px-3 py-2.5 text-[15px] font-semibold tracking-brand transition-colors",
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
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[15px] font-semibold text-ink-3"
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
                        "flex items-center rounded-xl px-3 py-2.5 text-[15px] font-semibold tracking-brand transition-colors",
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
                              "flex items-center justify-between rounded-xl px-3 py-2.5 text-[15px] font-semibold tracking-brand transition-colors",
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
