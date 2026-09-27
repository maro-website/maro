import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const CACHE_MS = 30_000;
let cache: Map<string, { value: boolean; at: number }> = new Map();

/** Read a feature flag from DB (cached briefly). Defaults to false if missing. */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_MS) return hit.value;

  try {
    const { data } = await getSupabaseAdmin()
      .from("feature_flags")
      .select("enabled")
      .eq("key", key)
      .maybeSingle();
    const value = Boolean(data?.enabled);
    cache.set(key, { value, at: now });
    return value;
  } catch {
    return false;
  }
}

export function clearFeatureFlagCache(): void {
  cache = new Map();
}

/** Engine LIVE provider cutover permission — does NOT block shadow compilation. */
export const FEATURE_PROMPT_COMPILER_V2 = "prompt_compiler_v2";
export const FEATURE_ENGINE_SHADOW_IMAZH = "engine_shadow_imazh";
export const FEATURE_ENGINE_SHADOW_LOGO = "engine_shadow_logo";

export interface ShadowFeatureFlags {
  imazh: boolean;
  logo: boolean;
}

export async function getShadowFeatureFlags(): Promise<ShadowFeatureFlags> {
  const [imazh, logo] = await Promise.all([
    isFeatureEnabled(FEATURE_ENGINE_SHADOW_IMAZH),
    isFeatureEnabled(FEATURE_ENGINE_SHADOW_LOGO),
  ]);
  return { imazh, logo };
}
