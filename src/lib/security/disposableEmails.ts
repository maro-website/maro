import domains from "./disposable-domains.json";

/** Curated signup denylist, shared with the native Auth hook migration. */
const DISPOSABLE_DOMAINS = new Set(domains);
const RESERVED_DOMAINS = new Set(["localhost", "test", "invalid", "example", "example.com", "example.net", "example.org"]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim().replace(/\.+$/, "");
  if (!domain) return false;
  if (RESERVED_DOMAINS.has(domain) || /\.(test|invalid|localhost|example)$/.test(domain)) return true;
  const labels = domain.split(".");
  for (let i = 0; i < labels.length; i++) if (DISPOSABLE_DOMAINS.has(labels.slice(i).join("."))) return true;
  return false;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
