/** Common disposable / temporary email domains (subset; extend as needed). */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.de",
  "sharklasers.com",
  "grr.la",
  "tempmail.com",
  "temp-mail.org",
  "throwaway.email",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "maildrop.cc",
  "dispostable.com",
  "10minutemail.com",
  "fakeinbox.com",
  "mintemail.com",
  "emailondeck.com",
  "tempail.com",
  "burnermail.io",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return false;
  if (DISPOSABLE_DOMAINS.has(domain)) return true;
  if (domain.endsWith(".mailinator.com")) return true;
  return false;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
