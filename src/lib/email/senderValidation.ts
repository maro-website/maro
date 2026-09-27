import "server-only";

import { isValidEmail } from "@/lib/security/validation";

const MARO_EMAIL_SUFFIX = "@maro.al";

export function isMaroDomainEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!isValidEmail(normalized)) return false;
  return normalized.endsWith(MARO_EMAIL_SUFFIX);
}

export function assertMaroSenderSettings(input: {
  fromEmail: string;
  replyTo: string;
}): void {
  if (!isMaroDomainEmail(input.fromEmail)) {
    throw new Error("from_email_must_be_maro_domain");
  }
  if (!isMaroDomainEmail(input.replyTo)) {
    throw new Error("reply_to_must_be_maro_domain");
  }
}
