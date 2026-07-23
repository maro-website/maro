"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMaro } from "@/context/store";
import { timeAgo } from "@/lib/utils/format";
import {
  loadNotifications,
  markAllRead,
  clearNotifications,
  subscribeNotifications,
  type MaroNotification,
} from "@/lib/notifications/store";
import { Bell, Coins, Gift, Users } from "lucide-react";

const ICONS: Record<MaroNotification["type"], React.ElementType> = {
  credits: Coins,
  giveaway: Gift,
  referral: Users,
};

export function NotificationBell() {
  const { user } = useMaro();
  const userId = user?.id ?? null;
  const [items, setItems] = React.useState<MaroNotification[]>([]);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const refresh = React.useCallback(() => setItems(loadNotifications(userId)), [userId]);

  React.useEffect(() => {
    refresh();
    return subscribeNotifications(refresh);
  }, [refresh]);

  const unread = items.filter((n) => !n.read).length;

  const place = React.useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = 320;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    setPos({ top: r.bottom + 8, left });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    place();
    markAllRead(userId);
    setTimeout(refresh, 50);
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, place, userId, refresh]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
        aria-label="Njoftime"
        title="Njoftime"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-c-red px-1 text-[10px] font-bold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                style={{ position: "fixed", top: pos.top, left: pos.left, width: 320 }}
                className="z-[130] overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
              >
                <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                  <span className="text-[13px] font-bold text-ink">Njoftime</span>
                  {items.length > 0 && (
                    <button
                      onClick={() => {
                        clearNotifications(userId);
                        refresh();
                      }}
                      className="text-[12px] font-semibold text-ink-3 transition-colors hover:text-ink"
                    >
                      Pastro
                    </button>
                  )}
                </div>
                <div className="scroll-thin max-h-[360px] overflow-y-auto">
                  {items.length === 0 ? (
                    <div className="px-4 py-10 text-center text-[13px] text-ink-3">
                      Ende s&apos;ke njoftime.
                    </div>
                  ) : (
                    items.map((n) => {
                      const Icon = ICONS[n.type] ?? Bell;
                      return (
                        <div key={n.id} className="flex gap-3 border-b border-line px-4 py-3 last:border-0">
                          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-brand">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13.5px] font-semibold text-ink">{n.title}</div>
                            {n.body && <div className="text-[12.5px] leading-relaxed text-ink-2">{n.body}</div>}
                            <div className="mt-0.5 text-[11.5px] text-ink-3">{timeAgo(n.createdAt)}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
