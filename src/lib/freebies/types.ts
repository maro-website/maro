export interface FreebieDrop {
  id: string; code: string; title: string; credits: number; max_claims: number; claims_count: number;
  min_generations_7d: number; audience: "all" | "user"; target_user_id: string | null;
  plan_id: string | null; plan_days: number | null; active: boolean; starts_at: string;
  expires_at: string | null; created_at: string;
  target: { id: string; email: string; username: string | null; full_name: string | null } | null;
}

export interface FreebieClaimResult {
  ok: boolean; credits?: number; balance?: number; claim_id?: string;
  plan_id?: string | null; expires_at?: string | null;
  error?: string; required?: number; current?: number; retry_after?: number;
}

export function freebieErrorMessage(code: string, details?: { required?: number; current?: number }) {
  if (code === "activity_required") return `Për këtë kod duhen të paktën ${details?.required ?? 1} gjenerime të përfunduara në 7 ditët e fundit. Ti ke ${details?.current ?? 0}.`;
  return ({
    invalid_code: "Kodi nuk është i saktë. Kontrolloje dhe provo përsëri.",
    already_claimed: "I ke marrë tashmë kreditet nga ky kod. Çdo llogari mund ta përdorë vetëm një herë.",
    code_inactive: "Ky kod është ndalur për momentin.",
    not_started: "Ky kod ende nuk është aktivizuar.",
    code_expired: "Afati i këtij kodi ka përfunduar.",
    claims_exhausted: "Të gjitha kreditet nga ky kod janë marrë. Nuk ka më vende të lira.",
    wrong_account: "Ky link është vetëm për një llogari tjetër. Hyr me llogarinë për të cilën është krijuar.",
    email_unconfirmed: "Konfirmo email-in tënd para se të marrësh kreditet.",
    unauthorized: "Hyr në llogarinë tënde për të marrë kreditet.",
    account_unavailable: "Llogaria jote nuk mund ta përdorë këtë kod për momentin.",
    existing_plan: "Ky kod përfshin një plan, ndërsa ti ke tashmë një plan aktiv. Kontakto mbështetjen.",
    active_payment: "Ke një pagesë plani në proces. Përfundoje para se të përdorësh këtë kod.",
    plan_unavailable: "Plani që përfshin ky kod nuk është i disponueshëm për momentin.",
    rate_limited: "Shumë kërkesa. Prit deri të përfundojë timer-i dhe provo përsëri.",
    code_exists: "Ky kod ekziston. Zgjidh një kod tjetër.",
    user_not_found: "Përdoruesi nuk u gjet. Kërko dhe zgjidhe përsëri.",
    invalid_request: "Kontrollo fushat dhe vlerat që ke shkruar.",
    freebies_unavailable: "Freebies nuk u ngarkuan ose ruajtën. Provo përsëri.",
    users_unavailable: "Përdoruesit nuk u ngarkuan. Provo kërkimin përsëri.",
    invalid_plan: "Plani ose kohëzgjatja e zgjedhur nuk është e vlefshme.",
    idempotency_conflict: "Kjo kërkesë është ruajtur me vlera të tjera. Rifresko faqen para se të krijosh një kod tjetër.",
    forbidden: "Nuk ke leje për këtë veprim.",
    insufficient_permission: "Nuk ke leje për të menaxhuar Freebies.",
    mfa_challenge_required: "Verifiko MFA në panelin admin para se të vazhdosh.",
    mfa_enrollment_required: "Aktivizo MFA në panelin admin para se të vazhdosh.",
  } as Record<string, string>)[code] ?? "Serveri nuk u përgjigj si duhet. Provo përsëri; kreditet nuk jepen dy herë.";
}
