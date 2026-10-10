"use client";
import { rateLimitedFetch as fetch } from "@/lib/client/rateLimit";

import { useEffect, useState } from "react";
import type { publicV1ImageModel } from "@/lib/engine/v1ImageModels";

type PublicModel = ReturnType<typeof publicV1ImageModel>;

/** A display projection, never an authoritative price submitted to generation. */
export function useV1ImageModels(toolId: string | null) {
  const [state, setState] = useState<{ toolId: string; models: PublicModel[] } | null>(null);
  useEffect(() => {
    if (!toolId) return;
    const controller = new AbortController();
    const refresh = () => fetch(`/api/ai/image/models?toolId=${encodeURIComponent(toolId)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("configuration_unavailable");
        const body = await response.json();
        if (!controller.signal.aborted) setState({ toolId, models: body.models });
      })
      .catch(() => { if (!controller.signal.aborted) setState(null); });
    refresh();
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, [toolId]);
  return state?.toolId === toolId ? state.models : [];
}
