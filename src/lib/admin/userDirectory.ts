import type { AccessRole } from "./permissions";

export interface AdminDirectoryUser {
  id: string;
  email: string;
  full_name: string | null;
  credits: number;
  is_creator: boolean;
  access_role: AccessRole | null;
  is_admin: boolean;
  created_at: string;
  plan: string;
  membershipId: string | null;
  planExpiresAt: string | null;
  storageUsedBytes: number;
  storageLimitBytes: number | null;
  storageOverrideBytes: number | null;
}
export interface AdminUserDirectory {
  users: AdminDirectoryUser[];
  total: number;
  canManage: boolean;
  canAdjustCredits: boolean;
  canManageCreators: boolean;
}

export function adminUserErrorMessage(error: string): string {
  const messages: Record<string, string> = {
    mfa_code_required: "Shkruaj kodin MFA me 6 shifra.",
    mfa_code_invalid: "Kodi MFA është i pasaktë ose ka skaduar.",
    mfa_unavailable: "Verifikimi MFA nuk është i disponueshëm. Provo përsëri.",
    mfa_enrollment_required: "Aktivizo MFA me aplikacionin Authenticator.",
    stale_membership: "Plani ka ndryshuar ndërkohë. Rifresko të dhënat dhe provo përsëri.",
    protected_account: "Llogaritë administrative nuk mund të fshihen nga kjo dritare.",
    self_delete_forbidden: "Nuk mund ta fshish llogarinë tënde nga admini.",
    active_generation: "Ky përdorues ka një gjenerim aktiv. Prit të përfundojë.",
    active_payment: "Ky përdorues ka një pagesë në proces. Prit të përfundojë.",
    automatic_subscription: "Abonimi automatik duhet të zgjidhet te menaxhimi i pagesave para këtij veprimi.",
    confirmation_mismatch: "Email-i i konfirmimit nuk përputhet me përdoruesin.",
    user_not_found: "Përdoruesi nuk u gjet.",
    delete_cleanup_pending: "Pastrimi nuk përfundoi. Llogaria është bllokuar për veprime të reja; provo fshirjen përsëri me kod të ri MFA.",
    rate_limited: "Shumë tentativa. Ndiq kohën e pritjes dhe provo përsëri.",
    invalid_request: "Kontrollo fushat dhe provo përsëri.",
    rpc_missing: "Përditësimi i databazës për këtë veprim ende nuk është aplikuar.",
  };
  return messages[error] ?? "Veprimi nuk përfundoi. Provo përsëri.";
}
