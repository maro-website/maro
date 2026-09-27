"use client";

// Convenience client hook: reads app_settings (via useSettings) and returns the
// resolved maroFort config. Avoids a second network round-trip.

import { useSettings } from "@/lib/hooks/useSettings";
import { resolveFortConfig, type ResolvedFortConfig } from "./config";
import type { FortConfig } from "./types";

export function useFortConfig(enabled = true): {
  fortConfig: FortConfig;
  resolved: ResolvedFortConfig;
  loading: boolean;
  reload: () => void;
} {
  const { fortConfig, loading, reload } = useSettings(enabled);
  return { fortConfig, resolved: resolveFortConfig(fortConfig), loading, reload };
}
