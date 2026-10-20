"use client";
import { AdminPrivateValue } from "@/components/admin/AdminPrivacy";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { adminRequest } from "./v1/shared";
import { startVisiblePoll } from "@/lib/services/visiblePoll";
import { PRESENCE_REFRESH_MS, type OnlinePresenceSnapshot } from "@/lib/analytics/presence";

export function OnlineNowCard() {
  const [data, setData] = useState<OnlinePresenceSnapshot | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let stopped = false;
    let pending = false;
    const load = async () => {
      if (pending || document.hidden) return;
      pending = true;
      try {
        const next = await adminRequest<OnlinePresenceSnapshot>("/api/admin/analytics/online");
        if (!stopped) { setData(next); setUnavailable(false); }
      } catch { if (!stopped) { setData(null); setUnavailable(true); } }
      finally { pending = false; }
    };
    const stop = startVisiblePoll(document, window, () => void load(), PRESENCE_REFRESH_MS);
    return () => { stopped = true; stop(); };
  }, []);
  return <section aria-label="Online tani" className="rounded-maro20 border border-line bg-surface p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><div className="flex items-center gap-2 text-sm font-semibold text-ink"><Radio className="h-4 w-4 text-brand" />Online tani</div>
        <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-ink" aria-live="polite" aria-atomic="true"><AdminPrivateValue>{data ? data.total.toLocaleString("sq-AL") : "—"}</AdminPrivateValue></p>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
        <p><strong className="text-ink tabular-nums"><AdminPrivateValue>{data ? data.signedIn.toLocaleString("sq-AL") : "—"}</AdminPrivateValue></strong> të kyçur</p>
        <p><strong className="text-ink tabular-nums"><AdminPrivateValue>{data ? data.guests.toLocaleString("sq-AL") : "—"}</AdminPrivateValue></strong> vizitorë pa login</p>
      </div>
    </div>
    <p className="mt-3 text-xs leading-relaxed text-ink-3">{unavailable ? "Numri live nuk u ngarkua. Po provojmë përsëri." : "Sesione aktive në 2 minutat e fundit · përditësohet çdo 30 sekonda."}</p>
    <p className="mt-1 text-xs leading-relaxed text-ink-3">Numër i përafërt: skedat e vizitorëve pa login mund të numërohen veçmas.</p>
  </section>;
}
