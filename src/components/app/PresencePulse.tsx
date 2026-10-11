"use client";

import { useEffect } from "react";
import { getAccessToken } from "@/lib/supabase/client";
import { startVisiblePoll } from "@/lib/services/visiblePoll";
import { PRESENCE_PULSE_MS } from "@/lib/analytics/presence";

/** An in-memory identifier expires with this page; no cookie or browser storage. */
let sessionId: string | undefined;

export function PresencePulse() {
  useEffect(() => {
    if (window.top !== window.self || navigator.doNotTrack === "1") return;
    sessionId ??= crypto.randomUUID();
    let stopped = false;
    let pending: AbortController | undefined;
    let retryAt = 0;
    const pulse = async () => {
      if (stopped || document.hidden || pending || Date.now() < retryAt) return;
      const controller = new AbortController();
      pending = controller;
      const timeout = window.setTimeout(() => controller.abort(), 8_000);
      try {
        const token = await getAccessToken();
        if (stopped || document.hidden || controller.signal.aborted) return;
        // This optional metric must never open a global error/rate-limit notice.
        const response = await globalThis.fetch("/api/presence", {
          method: "POST", cache: "no-store", signal: controller.signal,
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ sessionId }),
        });
        if (!response.ok) {
          const retry = Number(response.headers.get("Retry-After"));
          retryAt = Date.now() + (retry > 0 && retry <= 3600 ? retry * 1000 : 120_000);
        }
      } catch { retryAt = Date.now() + 120_000; }
      finally { window.clearTimeout(timeout); if (pending === controller) pending = undefined; }
    };
    const stopPoll = startVisiblePoll(document, window, () => void pulse(), PRESENCE_PULSE_MS);
    const visibility = () => {
      if (document.hidden) pending?.abort();
      else void pulse();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => { stopped = true; stopPoll(); pending?.abort(); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  return null;
}
