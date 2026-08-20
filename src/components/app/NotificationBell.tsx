"use client";

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMaro } from "@/context/store";
import { timeAgo } from "@/lib/utils/format";
import { MaroIcon } from "@/components/app/OptionIcon";
import {
  clearLocalNotifications,
  loadLocalNotifications,
  mapDbNotification,
  mergeNotifications,
  subscribeNotifications,
  type MaroNotification,
} from "@/lib/notifications/store";
import { Bell, Coins, Gift, Receipt, Users } from "lucide-react";

const ICONS: Record<MaroNotification["type"], React.ElementType> = {
  credits: Coins,
  billing: Receipt,
  giveaway: Gift,
  referral: Users,
};

export function NotificationBell() {
  const { user, getAccessToken } = useMaro();
  const userId = user?.id ?? null;
  const [items, setItems] = React.useState<MaroNotification[]>([]);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const refresh = React.useCallback(async () => {
    const local = loadLocalNotifications(userId);
    if (!userId) {
      setItems(local);
      return;
    }
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/notifications?limit=50", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = (await res.json()) as {
          notifications?: {
            id: string;
            kind: string;
            title: string;
            body: string;
            actionHref: string | null;
            readAt: string | null;
            createdAt: string;
          }[];
        };
        const db = (data.notifications ?? []).map((n) =>
          mapDbNotification({
            id: n.id,
            kind: n.kind,
            title: n.title,
            body: n.body,
            actionHref: n.actionHref,
            readAt: n.readAt,
            createdAt: n.createdAt,
          })
        );
        setItems(mergeNotifications(local, db));
        return;
      }
    } catch {
      /* fallback local only */
    }
    setItems(local);
  }, [userId, getAccessToken]);

  React.useEffect(() => {
    void refresh();
    return subscribeNotifications(() => {
      void refresh();
    });
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
    void (async () => {
      if (!userId) return;
      const token = await getAccessToken();
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ markAllRead: true }),
      });
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    })();
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node))
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, place, userId, getAccessToken]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-11 w-11 place-items-center rounded-maro16 bg-surface text-ink transition-colors hover:bg-surface-hover focus:outline-none"
        aria-label="Njoftime"
        title="Njoftime"
      >
        <MaroIcon name="notification" className="h-5 w-5 text-ink" />
        {unread > 0 && (
          <span className="absolute bottom-0.5 right-0.5 grid h-[14px] min-w-[14px] place-items-center rounded-full bg-brand px-0.5 text-[10px] font-bold leading-none text-white">
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
                className="z-[130] overflow-hidden rounded-maro20 bg-surface"
              >
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[13px] font-bold text-ink">Njoftime</span>
                  {items.length > 0 && (
                    <button
                      onClick={() => {
                        clearLocalNotifications(userId);
                        void refresh();
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
                      const inner = (
                        <div className="flex gap-3 px-4 py-3 last:border-0">
                          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-brand">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13.5px] font-semibold text-ink">{n.title}</div>
                            {n.body && (
                              <div className="text-[12.5px] leading-relaxed text-ink-2">{n.body}</div>
                            )}
                            <div className="mt-0.5 text-[11.5px] text-ink-3">{timeAgo(n.createdAt)}</div>
                          </div>
                        </div>
                      );
                      return n.actionHref ? (
                        <Link key={n.id} href={n.actionHref} className="block hover:bg-surface-2">
                          {inner}
                        </Link>
                      ) : (
                        <div key={n.id}>{inner}</div>
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
