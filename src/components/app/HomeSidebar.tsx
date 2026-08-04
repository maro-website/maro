"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { NotificationBell } from "@/components/app/NotificationBell";
import { ToolSidebarGrid } from "@/components/app/ToolSidebarGrid";
import { MaroIcon } from "@/components/app/OptionIcon";
import { X } from "lucide-react";

export function HomeSidebar({
  onNavigate,
  onCollapse,
  showHeader = true,
}: {
  onNavigate?: () => void;
  onCollapse?: () => void;
  showHeader?: boolean;
}) {
  return (
    <div className="flex h-full flex-col bg-surface">
      {showHeader && (
        <div className="flex items-center justify-between px-4 pt-4">
          <Link href="/" className="flex items-center gap-2" onClick={onNavigate}>
            <Logo showWord />
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell />
            {onCollapse && (
              <button
                type="button"
                onClick={onCollapse}
                className="hidden h-9 w-9 min-w-[44px] place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink lg:grid"
                aria-label="Mbyll sidebar"
                title="Mbyll sidebar"
              >
                <MaroIcon name="sidebarFlip" className="h-5 w-5" />
              </button>
            )}
            {onNavigate && (
              <button
                type="button"
                onClick={onNavigate}
                className="grid h-9 w-9 min-w-[44px] place-items-center rounded-lg text-ink-3 hover:bg-surface-2 lg:hidden"
                aria-label="Mbyll"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {!showHeader && onCollapse && (
        <div className="flex justify-end px-3 pt-3">
          <button
            type="button"
            onClick={onCollapse}
            className="grid h-9 w-9 min-w-[44px] place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Mbyll sidebar"
            title="Mbyll sidebar"
          >
            <MaroIcon name="sidebarFlip" className="h-5 w-5" />
          </button>
        </div>
      )}

      <ToolSidebarGrid onNavigate={onNavigate} />
    </div>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
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
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute inset-y-0 left-0 w-full max-w-[320px] bg-surface shadow-xl"
          >
            <HomeSidebar onNavigate={onClose} showHeader />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
