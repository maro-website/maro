/** Core types for the Maro transactional email engine (Phase 0 foundation). */

export type EmailLocale = "sq" | (string & {});

export type EmailTemplateCategory = "auth" | "account" | "commerce" | "workspace";

export type EmailTemplateKey =
  | "auth.confirm_signup"
  | "auth.reset_password"
  | "auth.email_change"
  | "auth.magic_link"
  | "plan_expiring_2_days"
  | "plan_expiring_1_day";

/** Admin-editable structured body — no raw HTML, scripts, or arbitrary CSS. */
export interface EmailStructuredContent {
  heading: string;
  paragraphs: string[];
  cta?: {
    label: string;
    url: string;
  };
  secondaryText?: string;
  footerNote?: string;
}

export type EmailVersionStatus = "draft" | "live" | "archived";

export interface EmailTemplateVersionRow {
  id: string;
  templateId: string;
  versionLabel: string;
  status: EmailVersionStatus;
  subject: string;
  previewText: string;
  content: EmailStructuredContent;
  allowedVariables: string[];
  changeNote: string;
  createdAt: string;
  publishedAt: string | null;
}

export interface EmailTemplateRow {
  id: string;
  templateKey: EmailTemplateKey | string;
  name: string;
  category: EmailTemplateCategory;
  locale: EmailLocale;
  enabled: boolean;
  isSystem: boolean;
  liveVersionId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedEmailTemplate {
  templateKey: string;
  locale: EmailLocale;
  category: EmailTemplateCategory;
  isSystem: boolean;
  subject: string;
  previewText: string;
  content: EmailStructuredContent;
  versionId: string;
}

export type EmailProviderErrorCategory =
  | "CONFIG_MISSING"
  | "VALIDATION"
  | "PROVIDER"
  | "RATE_LIMIT"
  | "NETWORK"
  | "UNKNOWN";

export interface EmailProviderSendResult {
  success: boolean;
  providerMessageId?: string;
  errorCategory?: EmailProviderErrorCategory;
  retryable?: boolean;
  message?: string;
}

export type EmailOutboxStatus = "queued" | "sending" | "sent" | "failed" | "cancelled";

export type EmailLogStatus = "sent" | "delivered" | "bounced" | "failed" | "complained";

export interface RenderEmailInput {
  templateKey: string;
  locale?: EmailLocale;
  variables: Record<string, string>;
  /** Optional override for preview/tests — still validated against registry + schema. */
  contentOverride?: EmailStructuredContent;
  subjectOverride?: string;
  previewTextOverride?: string;
}

export interface RenderEmailResult {
  subject: string;
  previewText: string;
  html: string;
  text: string;
}

export interface SendEmailInput {
  templateKey: string;
  locale?: EmailLocale;
  to: string;
  variables: Record<string, string>;
  recipientUserId?: string | null;
  idempotencyKey?: string;
  /** Auth emails bypass the product-email kill switch. */
  channel: "auth" | "product";
}

export interface EnqueueEmailInput {
  templateKey: string;
  locale?: EmailLocale;
  recipientEmail: string;
  recipientUserId?: string | null;
  variables: Record<string, string>;
  idempotencyKey: string;
  scheduledAt?: Date;
}

export interface SendEmailResult {
  ok: boolean;
  providerMessageId?: string;
  errorCategory?: EmailProviderErrorCategory;
  retryable?: boolean;
  message?: string;
  logId?: string;
}

/**
 * Phase 1 auth hook contract (not implemented in Phase 0).
 *
 * Secure Email Change sends separate hook payloads per recipient. Do NOT assume
 * token_hash_new maps to the new email address — inspect the hook payload and
 * Supabase docs for the active token mapping when building confirmation URLs.
 *
 * Future callback for token_hash links must use supabase.auth.verifyOtp(...),
 * not exchangeCodeForSession(). PKCE code exchange remains a separate flow.
 *
 * Supabase rollback: disable the Send Email Hook to resume the configured Email
 * Provider. Do not disable the Email Provider itself. Hook failures do not
 * automatically fall back to Supabase SMTP — explicit fallback must be coded.
 */
export type AuthEmailChangeRecipientRole = "current" | "new";
