import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { AccessRole } from "./permissions";
import { decodeJwtAal, roleRequiresMfa } from "./mfaPolicy";

export { PRIVILEGED_MFA_ROLES, roleRequiresMfa, decodeJwtAal } from "./mfaPolicy";

export type MfaGateReason = "mfa_enrollment_required" | "mfa_challenge_required";

export type MfaGateResult =
  | { ok: true; aal: "aal1" | "aal2"; enrolled: boolean }
  | { ok: false; reason: MfaGateReason; enrolled: boolean; aal: "aal1" | "aal2" | null };

export async function userHasVerifiedTotp(userId: string): Promise<boolean> {
  try {
    const { data, error } = await getSupabaseAdmin().auth.admin.mfa.listFactors({ userId });
    if (error) return false;
    const factors = data?.factors ?? [];
    return factors.some(
      (f) => (f.factor_type === "totp" || f.factor_type === "phone") && f.status === "verified"
    );
  } catch {
    return false;
  }
}

/** Server-side MFA gate for privileged Control Center roles. */
export async function assertAdminMfa(input: {
  userId: string;
  role: AccessRole;
  accessToken?: string | null;
}): Promise<MfaGateResult> {
  if (!roleRequiresMfa(input.role)) {
    return { ok: true, aal: decodeJwtAal(input.accessToken) ?? "aal1", enrolled: false };
  }

  const enrolled = await userHasVerifiedTotp(input.userId);
  const aal = decodeJwtAal(input.accessToken);

  if (!enrolled) {
    return { ok: false, reason: "mfa_enrollment_required", enrolled: false, aal };
  }

  if (aal !== "aal2") {
    return { ok: false, reason: "mfa_challenge_required", enrolled: true, aal: aal ?? "aal1" };
  }

  return { ok: true, aal: "aal2", enrolled: true };
}
