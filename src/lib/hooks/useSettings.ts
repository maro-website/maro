"use client";

import * as React from "react";
import { getSupabaseBrowser, supabaseConfigured } from "@/lib/supabase/client";
import { DEFAULT_PRICING, type PricingConfig } from "@/lib/supabase/types";

interface SettingsState {
  pricing: PricingConfig;
  masterPrompt: string;
  toolPrompts: Record<string, string>;
  loading: boolean;
}

// Reads the single app_settings row (pricing + master prompt + tool prompts).
// Requires an authenticated session per RLS; otherwise falls back to defaults.
export function useSettings(enabled = true): SettingsState & { reload: () => void } {
  const [state, setState] = React.useState<SettingsState>({
    pricing: DEFAULT_PRICING,
    masterPrompt: "",
    toolPrompts: {},
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
        masterPrompt: (data?.master_prompt as string) ?? "",
        toolPrompts: (data?.tool_prompts as Record<string, string>) ?? {},
        pricing: {
          types: { ...DEFAULT_PRICING.types, ...(pricing.types ?? {}) },
          speed: { ...DEFAULT_PRICING.speed, ...(pricing.speed ?? {}) },
          tools: { ...DEFAULT_PRICING.tools, ...(pricing.tools ?? {}) },
          editCost: pricing.editCost ?? DEFAULT_PRICING.editCost,
          reklamaProduct: pricing.reklamaProduct ?? DEFAULT_PRICING.reklamaProduct,
          ads: pricing.ads,
        },
      });
    };
    try {
      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from("app_settings")
        .select("master_prompt, pricing, tool_prompts")
        .eq("id", 1)
        .single();
      if (!error) return apply(data);
      // Legacy fallback (tool_prompts column missing before migration 0003).
      const { data: legacy } = await sb
        .from("app_settings")
        .select("master_prompt, pricing")
        .eq("id", 1)
        .single();
      apply(legacy);
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [enabled]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}
