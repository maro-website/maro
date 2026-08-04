import { readJSON, writeJSON } from "@/lib/storage/local";
import { DEFAULT_PRICING, type PricingConfig } from "@/lib/supabase/types";
import type { FortConfig } from "@/lib/fort/types";

export const PUBLIC_SETTINGS_CACHE_KEY = "maro:v1:public-settings";

export interface PublicSettingsPayload {
  pricing: PricingConfig;
  fort_config: FortConfig;
}

export function mergePricingConfig(pricing: PricingConfig): PricingConfig {
  return {
    types: { ...DEFAULT_PRICING.types, ...(pricing.types ?? {}) },
    speed: { ...DEFAULT_PRICING.speed, ...(pricing.speed ?? {}) },
    tools: { ...DEFAULT_PRICING.tools, ...(pricing.tools ?? {}) },
    options: pricing.options ?? {},
    editCost: pricing.editCost ?? DEFAULT_PRICING.editCost,
    reklamaProduct: pricing.reklamaProduct ?? DEFAULT_PRICING.reklamaProduct,
    ads: pricing.ads,
    announcements: pricing.announcements ?? [],
    promptRevealCost: pricing.promptRevealCost,
    chatCost: pricing.chatCost,
  };
}

export function readCachedPublicSettings(): PublicSettingsPayload | null {
  const cached = readJSON<Partial<PublicSettingsPayload> | null>(PUBLIC_SETTINGS_CACHE_KEY, null);
  if (!cached?.pricing) return null;
  return {
    pricing: mergePricingConfig(cached.pricing),
    fort_config: (cached.fort_config as FortConfig) ?? {},
  };
}

export function writeCachedPublicSettings(data: PublicSettingsPayload): void {
  writeJSON(PUBLIC_SETTINGS_CACHE_KEY, data);
}

export async function fetchPublicSettings(
  token: string | null
): Promise<PublicSettingsPayload | null> {
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch("/api/settings/public", { headers, cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as Record<string, unknown>;
  const pricing = mergePricingConfig((data?.pricing as PricingConfig) ?? DEFAULT_PRICING);
  const fort_config = (data?.fort_config as FortConfig) ?? {};
  return { pricing, fort_config };
}

let inflight: Promise<PublicSettingsPayload | null> | null = null;

/** Warm the settings cache as soon as the user session is available. */
export function prefetchPublicSettings(token: string | null): Promise<PublicSettingsPayload | null> {
  if (!token) return Promise.resolve(null);
  if (!inflight) {
    inflight = fetchPublicSettings(token)
      .then((data) => {
        if (data) writeCachedPublicSettings(data);
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
