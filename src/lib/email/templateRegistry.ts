import type { EmailTemplateCategory, EmailTemplateKey } from "./types";

export type EmailTemplateVariableName =
  | "confirmation_url"
  | "recovery_url"
  | "magic_link_url"
  | "user_email"
  | "recipient_email"
  | "change_recipient_role";

export interface EmailTemplateRegistryEntry {
  key: EmailTemplateKey;
  name: string;
  category: EmailTemplateCategory;
  description: string;
  isSystem: true;
  /** Required auth templates cannot be disabled via admin or product kill switch. */
  canDisable: false;
  allowedVariables: readonly EmailTemplateVariableName[];
  requiredVariables: readonly EmailTemplateVariableName[];
  optionalVariables: readonly EmailTemplateVariableName[];
  /** Variables that must be valid https URLs after interpolation. */
  urlVariables: readonly EmailTemplateVariableName[];
  /**
   * When live DB content is invalid/unavailable, use registry default Albanian copy.
   * Auth sends must still succeed in Phase 1 even if admin content is broken.
   */
  fallbackSubject: string;
  fallbackPreviewText: string;
  fallbackContent: {
    heading: string;
    paragraphs: string[];
    cta?: { label: string; url: string };
    secondaryText?: string;
    footerNote?: string;
  };
}

const AUTH_CONFIRM_SIGNUP: EmailTemplateRegistryEntry = {
  key: "auth.confirm_signup",
  name: "Konfirmimi i regjistrimit",
  category: "auth",
  description: "Email i konfirmimit pas regjistrimit. Dërgohet përmes Send Email Hook (signup).",
  isSystem: true,
  canDisable: false,
  allowedVariables: ["confirmation_url", "user_email"],
  requiredVariables: ["confirmation_url"],
  optionalVariables: ["user_email"],
  urlVariables: ["confirmation_url"],
  fallbackSubject: "Konfirmo llogarinë tënde në maro.al",
  fallbackPreviewText: "Konfirmo email-in për të aktivizuar llogarinë.",
  fallbackContent: {
    heading: "Konfirmo llogarinë tënde",
    paragraphs: [
      "Faleminderit që u regjistrove në maro.al.",
      "Kliko butonin më poshtë për të konfirmuar adresën tënde të email-it.",
    ],
    cta: { label: "Konfirmo email-in", url: "{{confirmation_url}}" },
    footerNote: "Nëse nuk e ke krijuar ti këtë llogari, mund ta injorosh këtë email.",
  },
};

const AUTH_RESET_PASSWORD: EmailTemplateRegistryEntry = {
  key: "auth.reset_password",
  name: "Rivendosja e fjalëkalimit",
  category: "auth",
  description:
    "Email i rimarrjes së fjalëkalimit. UX: forgot password → recovery email → verifyOtp(token_hash) → /reset-password.",
  isSystem: true,
  canDisable: false,
  allowedVariables: ["recovery_url", "user_email"],
  requiredVariables: ["recovery_url"],
  optionalVariables: ["user_email"],
  urlVariables: ["recovery_url"],
  fallbackSubject: "Rivendos fjalëkalimin tënd — maro.al",
  fallbackPreviewText: "Kërkesë për rivendosjen e fjalëkalimit.",
  fallbackContent: {
    heading: "Rivendos fjalëkalimin",
    paragraphs: [
      "Kemi marrë një kërkesë për të rivendosur fjalëkalimin e llogarisë tënde.",
      "Kliko butonin më poshtë për të zgjedhur një fjalëkalim të ri.",
    ],
    cta: { label: "Rivendos fjalëkalimin", url: "{{recovery_url}}" },
    secondaryText: "Ky link skadon së shpejti por arsye sigurie.",
    footerNote: "Nëse nuk e ke kërkuar ti, injoroje këtë email.",
  },
};

/**
 * Secure Email Change (Phase 1+).
 *
 * Supabase may send separate hook payloads to the current and new addresses.
 * Map tokens from the hook payload — never assume token_hash_new === new email.
 */
const AUTH_EMAIL_CHANGE: EmailTemplateRegistryEntry = {
  key: "auth.email_change",
  name: "Ndryshimi i email-it",
  category: "auth",
  description:
    "Konfirmim ndryshimi email-i (Secure Email Change). recipient_email + change_recipient_role distinguish current vs new inbox.",
  isSystem: true,
  canDisable: false,
  allowedVariables: ["confirmation_url", "user_email", "recipient_email", "change_recipient_role"],
  requiredVariables: ["confirmation_url", "recipient_email", "change_recipient_role"],
  optionalVariables: ["user_email"],
  urlVariables: ["confirmation_url"],
  fallbackSubject: "Konfirmo ndryshimin e email-it — maro.al",
  fallbackPreviewText: "Konfirmo ndryshimin e adresës së email-it.",
  fallbackContent: {
    heading: "Konfirmo ndryshimin e email-it",
    paragraphs: [
      "Kemi marrë një kërkesë për të ndryshuar email-in e llogarisë tënde.",
      "Kliko butonin më poshtë për të konfirmuar këtë ndryshim.",
    ],
    cta: { label: "Konfirmo ndryshimin", url: "{{confirmation_url}}" },
    footerNote: "Nëse nuk e ke kërkuar ti, na kontakto menjëherë.",
  },
};

const AUTH_MAGIC_LINK: EmailTemplateRegistryEntry = {
  key: "auth.magic_link",
  name: "Magic link (e ardhshme)",
  category: "auth",
  description: "Magic link login — template seeded for future use; not wired in Phase 0/1 password-reset UX.",
  isSystem: true,
  canDisable: false,
  allowedVariables: ["magic_link_url", "user_email"],
  requiredVariables: ["magic_link_url"],
  optionalVariables: ["user_email"],
  urlVariables: ["magic_link_url"],
  fallbackSubject: "Hyr në maro.al",
  fallbackPreviewText: "Link i sigurt për hyrje.",
  fallbackContent: {
    heading: "Hyr në llogarinë tënde",
    paragraphs: ["Kliko butonin më poshtë për të hyrë në maro.al."],
    cta: { label: "Hyr tani", url: "{{magic_link_url}}" },
    footerNote: "Nëse nuk e ke kërkuar ti, injoroje këtë email.",
  },
};

export const EMAIL_TEMPLATE_REGISTRY: Record<EmailTemplateKey, EmailTemplateRegistryEntry> = {
  "auth.confirm_signup": AUTH_CONFIRM_SIGNUP,
  "auth.reset_password": AUTH_RESET_PASSWORD,
  "auth.email_change": AUTH_EMAIL_CHANGE,
  "auth.magic_link": AUTH_MAGIC_LINK,
};

export const EMAIL_TEMPLATE_KEYS = Object.keys(EMAIL_TEMPLATE_REGISTRY) as EmailTemplateKey[];

export function getTemplateRegistryEntry(templateKey: string): EmailTemplateRegistryEntry | null {
  if (templateKey in EMAIL_TEMPLATE_REGISTRY) {
    return EMAIL_TEMPLATE_REGISTRY[templateKey as EmailTemplateKey];
  }
  return null;
}

export function assertRegisteredTemplateKey(templateKey: string): EmailTemplateRegistryEntry {
  const entry = getTemplateRegistryEntry(templateKey);
  if (!entry) {
    throw new EmailRegistryError(`unknown_template:${templateKey}`);
  }
  return entry;
}

export function isAuthTemplateKey(templateKey: string): boolean {
  return templateKey.startsWith("auth.");
}

export class EmailRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailRegistryError";
  }
}
