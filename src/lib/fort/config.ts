// maroFort — config resolution helpers (pure, client-safe).
// Fills admin fort_config with sane defaults and exposes small predicates used
// by both the composer UI and the server pipeline.

import { FORT_DEFAULTS, type FortConfig, type FortModuleId } from "./types";

export interface ResolvedFortConfig {
  enabled: boolean;
  label: string;
  description: string;
  ctaText: string;
  badgeText: string;
  defaultCreativeFreedom: string;
  defaultOutputGoal: string;
  newSettingsDefault: boolean;
  briefScore: boolean;
  raw: FortConfig;
}

export function resolveFortConfig(config?: FortConfig): ResolvedFortConfig {
  const c = config ?? {};
  return {
    // Global maroFort defaults ON so the feature is live once a user is entitled;
    // admins can hard-disable it from the maroFort admin page.
    enabled: c.enabled !== false,
    label: c.label || FORT_DEFAULTS.label,
    description: c.description || FORT_DEFAULTS.description,
    ctaText: c.ctaText || FORT_DEFAULTS.ctaText,
    badgeText: c.badgeText || FORT_DEFAULTS.badgeText,
    defaultCreativeFreedom: c.defaultCreativeFreedom || FORT_DEFAULTS.defaultCreativeFreedom,
    defaultOutputGoal: c.defaultOutputGoal || "premium",
    newSettingsDefault: c.newSettingsDefault ?? true,
    briefScore: c.briefScore ?? FORT_DEFAULTS.briefScore,
    raw: c,
  };
}

// Whether maroFort is available for a given module (global + per-module gate).
export function isFortModuleEnabled(config: FortConfig | undefined, module: FortModuleId): boolean {
  const resolved = resolveFortConfig(config);
  if (!resolved.enabled) return false;
  const mod = config?.modules?.[module];
  return mod?.enabled !== false;
}
