/** Customer-safe messages; never render SDK/database/provider text. */
export function authErrorMessage(code?: string): string {
  switch (code) {
    case "invalid_credentials": return "Email-i ose fjalëkalimi nuk është i saktë.";
    case "email_not_confirmed": return "Konfirmo email-in para hyrjes. Mund të kërkosh një konfirmim të ri.";
    case "weak_password":
    case "weak-password": return "Fjalëkalimi nuk plotëson kërkesat e sigurisë. Zgjidh një më të fortë.";
    case "same_password": return "Zgjidh një fjalëkalim të ndryshëm nga ai i mëparshëm.";
    case "invalid-email": return "Shkruaj një email të vlefshëm.";
    case "disposable-email": return "Email-et e përkohshme nuk lejohen.";
    case "signup_disabled": return "Regjistrimet janë përkohësisht të mbyllura.";
    case "rate_limited":
    case "over_email_send_rate_limit":
    case "over_request_rate_limit": return "Shumë kërkesa. Prit pak dhe provo përsëri.";
    case "turnstile_required":
    case "turnstile_failed":
    case "turnstile_error": return "Verifikimi CAPTCHA dështoi ose skadoi. Provo përsëri.";
    default: return "Autentikimi nuk është i disponueshëm për momentin. Provo përsëri më vonë.";
  }
}
