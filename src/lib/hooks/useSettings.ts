"use client";

import * as React from "react";
import { getSupabaseBrowser, supabaseConfigured } from "@/lib/supabase/client";
import { DEFAULT_PRICING, type PricingConfig } from "@/lib/supabase/types";

interface SettingsState {
  pricing: PricingConfig;
  masterPrompt: string;
  loading: boolean;
}

// Reads the single app_settings row (pricing + master prompt). Requires an
// authenticated session per RLS; otherwise falls back to defaults.
export function useSettings(enabled = true): SettingsState & { reload: () => void } {
  const [state, setState] = React.useState<SettingsState>({
    pricing: DEFAULT_PRICING,
    masterPrompt: "",
    loading: true,
  });

  const load = React.useCallback(async () => {
    if (!supabaseConfigured || !enabled) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    try {
      const { data } = await getSupabaseBrowser()
        .from("app_settings")
        .select("master_prompt, pricing")
        .eq("id", 1)
        .single();
      const pricing = (data?.pricing as PricingConfig) ?? DEFAULT_PRICING;
      setState({
        loading: false,
        masterPrompt: data?.master_prompt ?? "",
        pricing: {
          types: { ...DEFAULT_PRICING.types, ...(pricing.types ?? {}) },
          speed: { ...DEFAULT_PRICING.speed, ...(pricing.speed ?? {}) },
          editCost: pricing.editCost ?? DEFAULT_PRICING.editCost,
        },
      });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [enabled]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}
