"use client";
import { rateLimitedFetch as fetch } from "@/lib/client/rateLimit";

import { useEffect, useState } from "react";
import type { publicV1ImageModel } from "@/lib/engine/v1ImageModels";
import { getAccessToken, getSupabaseBrowser, supabaseConfigured } from "@/lib/supabase/client";

type PublicModel = ReturnType<typeof publicV1ImageModel>;

/** A display projection, never an authoritative price submitted to generation. */
export function useV1ImageModels(toolId: string | null) {
  const [state, setState] = useState<{ toolId: string; models: PublicModel[] } | null>(null);
  useEffect(() => {
    if (!toolId) return;
    const controller = new AbortController();
    let version = 0;
    const refresh = async () => {
      const current = ++version;
      try {
        const token = await getAccessToken();
        if (controller.signal.aborted || current !== version) return;
        const response = await fetch(`/api/ai/image/models?toolId=${encodeURIComponent(toolId)}`, { cache: "no-store", signal: controller.signal, headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!response.ok) throw new Error("configuration_unavailable");
        const body = await response.json();
        if (!controller.signal.aborted && current === version) setState({ toolId, models: body.models });
      } catch { if (!controller.signal.aborted && current === version) setState(null); }
    };
    refresh();
    const subscription = supabaseConfigured ? getSupabaseBrowser().auth.onAuthStateChange(() => {
      ++version; setState(null);
      // Run outside the auth callback to avoid holding the Supabase session lock.
      window.setTimeout(() => { if (!controller.signal.aborted) void refresh(); }, 0);
    }).data.subscription : null;
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => { controller.abort(); subscription?.unsubscribe(); window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, [toolId]);
  return state?.toolId === toolId ? state.models : [];
}
