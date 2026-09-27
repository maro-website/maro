import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface InternalCanaryEligibility {
  eligible: boolean;
  lookupFailed: boolean;
}

/**
 * Server-side internal canary eligibility — UUID allowlist in Postgres.
 * Fail closed: lookup errors → not eligible.
 */
export async function checkInternalCanaryEligibility(
  userId: string | null | undefined
): Promise<InternalCanaryEligibility> {
  if (!userId) {
    return { eligible: false, lookupFailed: false };
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("engine_internal_canary_users")
      .select("user_id")
      .eq("user_id", userId)
      .eq("enabled", true)
      .maybeSingle();

    if (error) {
      console.error("[engine/canary] allowlist lookup failed:", error.message);
      return { eligible: false, lookupFailed: true };
    }

    return { eligible: Boolean(data?.user_id), lookupFailed: false };
  } catch (e) {
    console.error("[engine/canary] allowlist exception:", e);
    return { eligible: false, lookupFailed: true };
  }
}
