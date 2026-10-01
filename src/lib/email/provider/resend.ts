import "server-only";

import { Resend } from "resend";
import type { EmailProviderErrorCategory, EmailProviderSendResult } from "../types";

export interface ResendSendInput {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo: string;
  idempotencyKey?: string;
}

function mapResendError(message: string, retryable = false, category: EmailProviderErrorCategory = "PROVIDER"): EmailProviderSendResult {
  return {
    success: false,
    errorCategory: category,
    retryable,
    message,
  };
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function createResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/**
 * Server-only Resend adapter.
 * Resend is the sole transactional provider — no hidden fallback to Supabase SMTP.
 */
export async function sendViaResend(input: ResendSendInput): Promise<EmailProviderSendResult> {
  const client = createResendClient();
  if (!client) {
    return {
      success: false,
      errorCategory: "CONFIG_MISSING",
      retryable: false,
      message: "RESEND_API_KEY not configured",
    };
  }

  try {
    const { data, error } = await client.emails.send({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      headers: input.idempotencyKey
        ? { "Idempotency-Key": input.idempotencyKey }
        : undefined,
    });

    if (error) {
      const msg = error.message ?? "Resend send failed";
      const lower = msg.toLowerCase();
      if (lower.includes("rate") || lower.includes("429")) {
        return mapResendError(msg, true, "RATE_LIMIT");
      }
      return mapResendError(msg, false, "PROVIDER");
    }

    return {
      success: true,
      providerMessageId: data?.id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resend request failed";
    return mapResendError(message, true, "NETWORK");
  }
}
