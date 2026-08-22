"use client";

import * as React from "react";
import { getSupabaseBrowser, supabaseConfigured } from "@/lib/supabase/client";
import { DEFAULT_PRICING, type PricingConfig } from "@/lib/supabase/types";
import type { FortConfig } from "@/lib/fort/types";
import type { ToolOptionIcons } from "@/lib/tools/optionIcons";
import {
  fetchPublicSettings,
  mergePricingConfig,
  prefetchPublicSettings,
  readCachedPublicSettings,
  writeCachedPublicSettings,
  type PublicSettingsPayload,
} from "@/lib/settings/publicSettings";

interface SettingsState {
  pricing: PricingConfig;
  masterPrompt: string;
  toolPrompts: Record<string, string>;
  fortConfig: FortConfig;
  toolOptionIcons: ToolOptionIcons;
  loading: boolean;
}

function initialSettingsState(): SettingsState {
  // This initializer also runs during SSR, where localStorage is unavailable.
  // Keep it deterministic so the client hydrates the same tree. Cached values
  // are applied in the layout effect below before the browser paints.
  return {
    pricing: DEFAULT_PRICING,
    masterPrompt: "",
    toolPrompts: {},
    fortConfig: {},
    toolOptionIcons: {},
    loading: true,
  };
}

export function useSettings(enabled = true): SettingsState & { reload: () => void } {
  const [state, setState] = React.useState<SettingsState>(initialSettingsState);

  // Apply cached pricing before paint so credits aren't briefly wrong after SSR/hydration.
  React.useLayoutEffect(() => {
    const cached = readCachedPublicSettings();
    if (!cached) return;
    setState((s) => ({
      ...s,
      pricing: cached.pricing,
      fortConfig: cached.fort_config,
      toolOptionIcons: cached.tool_option_icons,
    }));
  }, []);

  const load = React.useCallback(async () => {
    if (!supabaseConfigured || !enabled) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    const apply = (data: PublicSettingsPayload | null) => {
      if (!data) {
        setState((s) => ({ ...s, loading: false }));
        return;
      }
      writeCachedPublicSettings(data);
      setState({
        loading: false,
        masterPrompt: "",
        toolPrompts: {},
        fortConfig: data.fort_config,
        toolOptionIcons: data.tool_option_icons,
        pricing: data.pricing,
      });
    };
    try {
      const sb = getSupabaseBrowser();
      const { data: sessionData } = await sb.auth.getSession();
      const token = sessionData.session?.access_token ?? null;
      const pub = await prefetchPublicSettings(token);
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

export { prefetchPublicSettings, mergePricingConfig, fetchPublicSettings };
