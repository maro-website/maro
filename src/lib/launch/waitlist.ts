import { normalizeEmail } from "@/lib/security/disposableEmails";

export const LAUNCH_EMAIL_MAX_LENGTH = 254;

export function normalizeLaunchEmail(value: string): string {
  return normalizeEmail(value);
}

export function isValidLaunchEmail(value: string): boolean {
  const email = normalizeLaunchEmail(value);
  if (!email || email.length > LAUNCH_EMAIL_MAX_LENGTH || /\s/.test(email)) return false;

  const at = email.lastIndexOf("@");
  if (at <= 0 || at !== email.indexOf("@")) return false;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || local.length > 64 || local.startsWith(".") || local.endsWith(".")) return false;
  if (local.includes("..") || !domain.includes(".") || domain.length > 253) return false;

  const labels = domain.split(".");
  return labels.every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      !label.startsWith("-") &&
      !label.endsWith("-") &&
      /^[a-z0-9-]+$/i.test(label)
  );
}

