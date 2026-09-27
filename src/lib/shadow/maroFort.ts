import { isModuleLive } from "@/lib/modules/availability";

/** Parked until V2; the shared product release policy owns availability. */
export const MARO_FORT_ENABLED: boolean = isModuleLive("fort");

/** Ignore stale clients and saved expert payloads while the feature is parked. */
export function withoutParkedFort<T extends { fort?: unknown }>(input: T): T {
  return MARO_FORT_ENABLED ? input : { ...input, fort: undefined };
}
