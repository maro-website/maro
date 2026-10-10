import type { CanonicalPlanId } from "@/lib/commerce/types";

export interface AdminPlanOption {
  id: CanonicalPlanId;
  display_name: string;
  duration_days: number;
}

export interface AdminUserMembership {
  id: string;
  planId: CanonicalPlanId;
  planName: string;
  startedAt: string;
  expiresAt: string;
  suspended: boolean;
  source: "manual" | "paid" | "other";
  note: string | null;
  actorEmail: string | null;
  grantedAt: string | null;
}

export interface AdminUserPlans {
  plans: AdminPlanOption[];
  memberships: AdminUserMembership[];
  canManage: boolean;
}

export function userPlanErrorMessage(error: string): string {
  const messages: Record<string, string> = {
    existing_plan: "Ky përdorues ka një plan ekzistues që ende nuk ka skaduar.",
    invalid_plan: "Zgjedh një plan aktiv nga lista.",
    invalid_duration: "Kohëzgjatja duhet të jetë nga 1 deri në 365 ditë.",
    invalid_note: "Shkruaj një arsye private me 3 deri në 1000 karaktere.",
    user_not_found: "Përdoruesi nuk u gjet.",
    idempotency_conflict: "Kërkesa ka ndryshuar. Hape përsëri dritaren e planit.",
    rpc_missing: "Menaxhimi i planeve për momentin nuk është i disponueshëm.",
    load_failed: "Planet nuk u ngarkuan. Provo përsëri.",
    forbidden: "Nuk ke leje për këtë veprim.",
    insufficient_permission: "Nuk ke leje për të aktivizuar plane.",
    mfa_challenge_required: "Verifiko MFA para se të aktivizosh planin.",
  };
  return messages[error] ?? "Plani nuk u ruajt. Provo përsëri.";
}
