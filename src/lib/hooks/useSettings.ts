"use client";

import * as React from "react";
import { getSupabaseBrowser, supabaseConfigured } from "@/lib/supabase/client";
import { DEFAULT_PRICING, type PricingConfig } from "@/lib/supabase/types";
import type { FortConfig } from "@/lib/fort/types";

interface SettingsState {
  pricing: PricingConfig;
  masterPrompt: string;
  toolPrompts: Record<string, string>;
  fortConfig: FortConfig;
  loading: boolean;
}

async function fetchPublicSettings(token: string | null): Promise<Record<string, unknown> | null> {
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch("/api/settings/public", { headers });
  if (!res.ok) return null;
  return res.json();
}

export function useSettings(enabled = true): SettingsState & { reload: () => void } {
  const [state, setState] = React.useState<SettingsState>({
    pricing: DEFAULT_PRICING,
    masterPrompt: "",
    toolPrompts: {},
    fortConfig: {},
    loading: true,
  });

  const load = React.useCallback(async () => {
    if (!supabaseConfigured || !enabled) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    const apply = (data: Record<string, unknown> | null) => {
      const pricing = (data?.pricing as PricingConfig) ?? DEFAULT_PRICING;
      setState({
        loading: false,
        masterPrompt: "",
        toolPrompts: {},
        fortConfig: (data?.fort_config as FortConfig) ?? {},
        pricing: {
          types: { ...DEFAULT_PRICING.types, ...(pricing.types ?? {}) },
          speed: { ...DEFAULT_PRICING.speed, ...(pricing.speed ?? {}) },
          tools: { ...DEFAULT_PRICING.tools, ...(pricing.tools ?? {}) },
          options: pricing.options ?? {},
          editCost: pricing.editCost ?? DEFAULT_PRICING.editCost,
          reklamaProduct: pricing.reklamaProduct ?? DEFAULT_PRICING.reklamaProduct,
          ads: pricing.ads,
          announcements: pricing.announcements ?? [],
        },
      });
    };
    try {
      const sb = getSupabaseBrowser();
      const { data: sessionData } = await sb.auth.getSession();
      const token = sessionData.session?.access_token ?? null;
      const pub = await fetchPublicSettings(token);
      if (pub) return apply(pub);
      apply(null);
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [enabled]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}
