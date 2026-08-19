import "server-only";

import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";
import { renderEmailFromResolved } from "./render";
import { sendViaResend } from "./provider/resend";
import {
  assertProductEmailEnabled,
  resolveEmailTemplateForSend,
} from "./templates";
import {
  buildSanitizedOutboxPayload,
  recipientDomainFromEmail,
  sanitizeEmailMetadata,
} from "./sanitize";
import { assertRegisteredTemplateKey, isAuthTemplateKey } from "./templateRegistry";
import { validateVariablesForTemplate } from "./variables";
import type {
  EmailLogStatus,
  EmailLocale,
  EmailStructuredContent,
  EnqueueEmailInput,
  RenderEmailInput,
  RenderEmailResult,
  SendEmailInput,
  SendEmailResult,
} from "./types";

const DEFAULT_LOCALE: EmailLocale = "sq";

export interface EmailSettingsSnapshot {
  fromName: string;
  fromEmail: string;
  replyTo: string;
  provider: string;
  productEmailEnabled: boolean;
}

export async function getEmailSettings(): Promise<EmailSettingsSnapshot> {
  const defaults: EmailSettingsSnapshot = {
    fromName: "maro",
    fromEmail: "info@maro.al",
    replyTo: "info@maro.al",
    provider: "resend",
    productEmailEnabled: true,
  };

  if (!supabaseServerConfigured()) return defaults;

  const { data } = await getSupabaseAdmin()
    .from("email_settings")
    .select("from_name, from_email, reply_to, provider, product_email_enabled")
    .eq("id", "default")
    .maybeSingle();

  if (!data) return defaults;

  return {
    fromName: String(data.from_name ?? defaults.fromName),
    fromEmail: String(data.from_email ?? defaults.fromEmail),
    replyTo: String(data.reply_to ?? defaults.replyTo),
    provider: String(data.provider ?? defaults.provider),
    productEmailEnabled: data.product_email_enabled !== false,
  };
}

function formatFrom(settings: EmailSettingsSnapshot): string {
  return `${settings.fromName} <${settings.fromEmail}>`;
}

/** Render only — no provider call, no DB required when content overrides are supplied. */
export async function renderEmailForSend(input: RenderEmailInput): Promise<RenderEmailResult> {
  assertRegisteredTemplateKey(input.templateKey);

  if (input.contentOverride) {
    return renderEmailFromResolved({
      ...input,
      subject: input.subjectOverride ?? input.contentOverride.heading,
      previewText: input.previewTextOverride ?? "",
      content: input.contentOverride,
    });
  }

  const resolved = await resolveEmailTemplateForSend(input.templateKey, input.locale ?? DEFAULT_LOCALE);
  validateVariablesForTemplate(input.templateKey, input.variables, resolved.content);

  return renderEmailFromResolved({
    templateKey: input.templateKey,
    locale: input.locale,
    variables: input.variables,
    subject: resolved.subject,
    previewText: resolved.previewText,
    content: resolved.content,
  });
}

async function writeEmailLog(input: {
  templateKey: string;
  recipientUserId?: string | null;
  recipientEmail: string;
  provider: string;
  providerMessageId?: string;
  status: EmailLogStatus;
  errorCategory?: string;
  metadata?: Record<string, unknown>;
}): Promise<string | undefined> {
  if (!supabaseServerConfigured()) return undefined;

  const domain = recipientDomainFromEmail(input.recipientEmail);
  const { data, error } = await getSupabaseAdmin()
    .from("email_logs")
    .insert({
      template_key: input.templateKey,
      recipient_user_id: input.recipientUserId ?? null,
      recipient_domain: domain,
      provider: input.provider,
      provider_message_id: input.providerMessageId ?? null,
      status: input.status,
      error_category: input.errorCategory ?? null,
      metadata: sanitizeEmailMetadata(input.metadata ?? {}) ?? {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("[email_logs] insert failed:", error.message);
    return undefined;
  }
  return data?.id as string | undefined;
}

/**
 * Send a transactional email via Resend.
 *
 * Auth channel bypasses product_email_enabled kill switch.
 * Required auth templates cannot be disabled — registry enforces canDisable: false.
 *
 * Rollback note (Phase 1+): disable Supabase Send Email Hook to resume the configured
 * Email Provider. Do not disable the Email Provider. No automatic SMTP fallback.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  assertRegisteredTemplateKey(input.templateKey);

  const settings = await getEmailSettings();

  if (input.channel === "product") {
    if (!settings.productEmailEnabled) {
      return {
        ok: false,
        errorCategory: "VALIDATION",
        retryable: false,
        message: "product_email_disabled",
      };
    }
    await assertProductEmailEnabled();
  }

  const rendered = await renderEmailForSend({
    templateKey: input.templateKey,
    locale: input.locale ?? DEFAULT_LOCALE,
    variables: input.variables,
  });

  const started = Date.now();
  const providerResult = await sendViaResend({
    from: formatFrom(settings),
    to: input.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    replyTo: settings.replyTo,
    idempotencyKey: input.idempotencyKey,
  });

  const latencyMs = Date.now() - started;

  if (!providerResult.success) {
    const logId = await writeEmailLog({
      templateKey: input.templateKey,
      recipientUserId: input.recipientUserId,
      recipientEmail: input.to,
      provider: settings.provider,
      status: "failed",
      errorCategory: providerResult.errorCategory,
      metadata: { latency_ms: latencyMs, channel: input.channel },
    });

    return {
      ok: false,
      providerMessageId: providerResult.providerMessageId,
      errorCategory: providerResult.errorCategory,
      retryable: providerResult.retryable,
      message: providerResult.message,
      logId,
    };
  }

  const logId = await writeEmailLog({
    templateKey: input.templateKey,
    recipientUserId: input.recipientUserId,
    recipientEmail: input.to,
    provider: settings.provider,
    providerMessageId: providerResult.providerMessageId,
    status: "sent",
    metadata: { latency_ms: latencyMs, channel: input.channel },
  });

  return {
    ok: true,
    providerMessageId: providerResult.providerMessageId,
    logId,
  };
}

/** Render a specific template version (draft or live) without mutating live state. */
export async function renderEmailVersion(input: {
  templateKey: string;
  locale?: EmailLocale;
  subject: string;
  previewText: string;
  content: EmailStructuredContent;
  variables: Record<string, string>;
}): Promise<RenderEmailResult> {
  assertRegisteredTemplateKey(input.templateKey);
  validateVariablesForTemplate(input.templateKey, input.variables, input.content);
  return renderEmailFromResolved({
    templateKey: input.templateKey,
    locale: input.locale ?? DEFAULT_LOCALE,
    variables: input.variables,
    subject: input.subject,
    previewText: input.previewText,
    content: input.content,
  });
}

/** Send pre-rendered email content via Resend — used by test-send and version preview paths. */
export async function sendRenderedEmail(input: {
  to: string;
  templateKey: string;
  rendered: RenderEmailResult;
  channel: "auth" | "product";
  recipientUserId?: string | null;
  idempotencyKey?: string;
  subjectPrefix?: string;
  metadata?: Record<string, unknown>;
}): Promise<SendEmailResult> {
  assertRegisteredTemplateKey(input.templateKey);
  const settings = await getEmailSettings();

  if (input.channel === "product") {
    if (!settings.productEmailEnabled) {
      return {
        ok: false,
        errorCategory: "VALIDATION",
        retryable: false,
        message: "product_email_disabled",
      };
    }
    await assertProductEmailEnabled();
  }

  const subject = input.subjectPrefix
    ? `${input.subjectPrefix}${input.rendered.subject}`
    : input.rendered.subject;

  const started = Date.now();
  const providerResult = await sendViaResend({
    from: formatFrom(settings),
    to: input.to,
    subject,
    html: input.rendered.html,
    text: input.rendered.text,
    replyTo: settings.replyTo,
    idempotencyKey: input.idempotencyKey,
  });

  const latencyMs = Date.now() - started;
  const logMetadata = {
    ...input.metadata,
    latency_ms: latencyMs,
    channel: input.channel,
    test_send: input.metadata?.test_send === true,
  };

  if (!providerResult.success) {
    const logId = await writeEmailLog({
      templateKey: input.templateKey,
      recipientUserId: input.recipientUserId,
      recipientEmail: input.to,
      provider: settings.provider,
      status: "failed",
      errorCategory: providerResult.errorCategory,
      metadata: logMetadata,
    });

    return {
      ok: false,
      providerMessageId: providerResult.providerMessageId,
      errorCategory: providerResult.errorCategory,
      retryable: providerResult.retryable,
      message: providerResult.message,
      logId,
    };
  }

  const logId = await writeEmailLog({
    templateKey: input.templateKey,
    recipientUserId: input.recipientUserId,
    recipientEmail: input.to,
    provider: settings.provider,
    providerMessageId: providerResult.providerMessageId,
    status: "sent",
    metadata: logMetadata,
  });

  return {
    ok: true,
    providerMessageId: providerResult.providerMessageId,
    logId,
  };
}

/**
 * Enqueue a non-auth transactional email for future cron processing (Phase 3+).
 * Not wired to productEvents in Phase 0.
 */
export async function enqueueEmail(input: EnqueueEmailInput): Promise<{ ok: boolean; outboxId?: string; error?: string }> {
  assertRegisteredTemplateKey(input.templateKey);

  if (isAuthTemplateKey(input.templateKey)) {
    return { ok: false, error: "auth_templates_use_send_email_not_outbox" };
  }

  if (!supabaseServerConfigured()) {
    return { ok: false, error: "not-configured" };
  }

  const settings = await getEmailSettings();
  if (!settings.productEmailEnabled) {
    return { ok: false, error: "product_email_disabled" };
  }

  validateVariablesForTemplate(input.templateKey, input.variables);

  const payload = buildSanitizedOutboxPayload(input.variables);

  const { data, error } = await getSupabaseAdmin()
    .from("email_outbox")
    .insert({
      template_key: input.templateKey,
      locale: input.locale ?? DEFAULT_LOCALE,
      recipient_email: input.recipientEmail,
      recipient_user_id: input.recipientUserId ?? null,
      payload,
      idempotency_key: input.idempotencyKey,
      status: "queued",
      scheduled_at: (input.scheduledAt ?? new Date()).toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: true, outboxId: undefined };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, outboxId: data?.id as string };
}
