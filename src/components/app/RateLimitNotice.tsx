"use client";
import * as React from "react";
import { Timer } from "lucide-react";
import { clearClientRateLimit, formatRetryTime, rateLimitSnapshot, subscribeRateLimit } from "@/lib/client/rateLimit";

export function RateLimitNotice() {
  const limit = React.useSyncExternalStore(subscribeRateLimit, rateLimitSnapshot, () => null);
  const [remaining, setRemaining] = React.useState(0);
  React.useEffect(() => {
    if (!limit) return;
    const tick = () => { const seconds = Math.ceil((limit.expiresAt - Date.now()) / 1000); setRemaining(Math.max(0, seconds)); if (seconds <= 0) clearClientRateLimit(); };
    let interval: number | undefined;
    const schedule = () => { window.clearInterval(interval); tick(); if (document.visibilityState === "visible") interval = window.setInterval(tick, 1000); };
    schedule(); document.addEventListener("visibilitychange", schedule);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", schedule); };
  }, [limit]);
  if (!limit) return null;
  return <aside role="status" aria-live="polite" className="fixed bottom-4 left-4 right-4 z-[var(--maro-z-toast)] mx-auto flex max-w-lg items-center gap-4 rounded-maro20 border border-line bg-surface p-4 text-ink">
    <Timer aria-hidden="true" className="h-6 w-6 shrink-0 text-ink-3" />
    <div className="min-w-0 flex-1"><p className="font-semibold">Shumë kërkesa · {limit.scope}</p><p className="text-sm text-ink-3">{limit.known ? "Provo përsëri kur të mbarojë koha." : "Shërbimi nuk dha kohë të saktë; prit para tentativës tjetër."}</p></div>
    <span aria-label="Koha e mbetur" className="text-xl font-bold tabular-nums" aria-live="off">{formatRetryTime(remaining)}</span>
  </aside>;
}
