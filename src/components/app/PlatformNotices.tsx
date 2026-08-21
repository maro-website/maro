"use client";

import * as React from "react";
import { X } from "lucide-react";
import { getAccessToken, getSupabaseBrowser, supabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

export type NoticePlacement = "global" | "promptbox";

interface Notice {
  id: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  dismissible: boolean;
}

export function PlatformNotices({
  placement,
  moduleId = "platform",
}: {
  placement: NoticePlacement;
  moduleId?: string;
}) {
  const [items, setItems] = React.useState<Notice[]>([]);

  const load = React.useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setItems([]);
      return;
    }
    const query = new URLSearchParams({ placement, module: moduleId });
    const response = await fetch(`/api/notification-campaigns?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return;
    const payload = (await response.json()) as { campaigns?: Notice[] };
    setItems(payload.campaigns ?? []);
  }, [moduleId, placement]);

  React.useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 30_000);
    const refresh = () => void load();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  React.useEffect(() => {
    if (!supabaseConfigured) return;
    const channel = getSupabaseBrowser()
      .channel(`platform-notices-${placement}-${moduleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notification_campaigns" }, () => void load())
      .subscribe();
    return () => { void getSupabaseBrowser().removeChannel(channel); };
  }, [load, moduleId, placement]);

  async function dismiss(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    const token = await getAccessToken();
    if (!token) return;
    const response = await fetch("/api/notification-campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) void load();
  }

  if (items.length === 0) return null;
  return (
    <div className={cn("flex shrink-0 flex-col gap-2", placement === "global" ? "bg-canvas px-3 pt-2 sm:px-4 lg:px-[30px]" : "mb-2.5") }>
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 rounded-maro16 bg-surface-selected px-4 py-3 text-ink">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold leading-tight">{item.title}</div>
            {item.body && <div className="mt-0.5 text-[12.5px] text-ink-2">{item.body}</div>}
          </div>
          {item.ctaLabel && item.ctaUrl && (
            <a href={item.ctaUrl} className="shrink-0 rounded-maro12 bg-ink px-3 py-2 text-[12px] font-semibold text-white">
              {item.ctaLabel}
            </a>
          )}
          {item.dismissible && (
            <button type="button" onClick={() => void dismiss(item.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-maro8 text-ink-3 hover:bg-surface hover:text-ink" aria-label="Mbyll njoftimin">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
