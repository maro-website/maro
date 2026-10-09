import "server-only";
import { createHash } from "node:crypto";

import { Webhook } from "standardwebhooks";
import type { EmailTemplateKey } from "./types";
import { sendEmail } from "./engine";
import { buildAuthCallbackUrl, hookActionToOtpType } from "./authUrls";
import { resolveEmailChangeDeliveries, type SupabaseAuthHookPayload } from "./secureEmailChange";
import { getAppOrigin } from "@/lib/config/appOrigin";
import { isAuthEmailHookConfigured } from "@/lib/config/serverEnv";
import { sanitizeInternalRedirectPath } from "@/lib/auth/safeRedirect";

export type AuthHookFailureCategory =
  | "signature"
  | "payload"
  | "unsupported_action"
  | "template"
  | "provider"
  | "config";

export interface AuthHookProcessResult {
  ok: boolean;
  status: number;
  retryable: boolean;
  category?: AuthHookFailureCategory;
  message?: string;
}

const SUPPORTED_ACTIONS = new Set(["signup", "recovery", "email_change"]);

function normalizeWebhookSecret(raw: string): string {
  const trimmed = raw.trim();
  const idx = trimmed.indexOf("whsec_");
  if (idx >= 0) return trimmed.slice(idx);
  return trimmed;
}

export { isAuthEmailHookConfigured } from "@/lib/config/serverEnv";

export function verifyAuthHookSignature(rawBody: string, headers: Headers): void {
  const secret = process.env.SUPABASE_AUTH_HOOK_SECRET?.trim();
  if (!secret) {
    throw new AuthHookError("hook_secret_missing", 503, false);
  }

  const wh = new Webhook(normalizeWebhookSecret(secret));
  wh.verify(rawBody, {
    "webhook-id": headers.get("webhook-id") ?? "",
    "webhook-timestamp": headers.get("webhook-timestamp") ?? "",
    "webhook-signature": headers.get("webhook-signature") ?? "",
  });
}

export class AuthHookError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly retryable: boolean,
    readonly category: AuthHookFailureCategory = "payload"
  ) {
    super(message);
    this.name = "AuthHookError";
  }
}

function parseHookPayload(rawBody: string): SupabaseAuthHookPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new AuthHookError("invalid_json", 400, false, "payload");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new AuthHookError("invalid_payload", 400, false, "payload");
  }

  const obj = parsed as Record<string, unknown>;
  const user = obj.user;
  const email_data = obj.email_data;

  if (!user || typeof user !== "object" || !email_data || typeof email_data !== "object") {
    throw new AuthHookError("missing_user_or_email_data", 400, false, "payload");
  }

  return {
    user: user as SupabaseAuthHookPayload["user"],
    email_data: email_data as SupabaseAuthHookPayload["email_data"],
  };
}

function safeNextFromRedirectTo(redirectTo?: string): string | undefined {
  if (!redirectTo?.trim()) return undefined;
  const trimmed = redirectTo.trim();
  if (trimmed.startsWith("/")) {
    const path = sanitizeInternalRedirectPath(trimmed, "/");
    return path === "/" ? undefined : path;
  }
  try {
    const parsed = new URL(trimmed);
    const appOrigin = new URL(getAppOrigin()).origin;
    if (parsed.origin !== appOrigin) return undefined;
    if (parsed.pathname === "/auth/callback") {
      return sanitizeInternalRedirectPath(parsed.searchParams.get("next"), "/");
    }
    const internal = `${parsed.pathname}${parsed.search}`;
    const path = sanitizeInternalRedirectPath(internal, "/");
    return path === "/" ? undefined : path;
  } catch {
    return undefined;
  }
}

function templateKeyForAction(action: string): EmailTemplateKey | null {
  switch (action) {
    case "signup":
      return "auth.confirm_signup";
    case "recovery":
      return "auth.reset_password";
    case "email_change":
      return "auth.email_change";
    default:
      return null;
  }
}

function buildTemplateVariables(input: {
  templateKey: EmailTemplateKey;
  actionUrl: string;
  userEmail?: string;
  recipientEmail: string;
  recipientRole?: "current" | "new";
}): Record<string, string> {
  if (input.templateKey === "auth.reset_password") {
    return {
      recovery_url: input.actionUrl,
      user_email: input.recipientEmail,
    };
  }

  if (input.templateKey === "auth.email_change") {
    return {
      confirmation_url: input.actionUrl,
      user_email: input.userEmail ?? input.recipientEmail,
      recipient_email: input.recipientEmail,
      change_recipient_role: input.recipientRole ?? "new",
    };
  }

  return {
    confirmation_url: input.actionUrl,
    user_email: input.recipientEmail,
  };
}

/**
 * Process a verified Supabase Send Email Hook payload.
 * Synchronous auth send — never uses email_outbox.
 *
 * Rollback: disable the Send Email Hook in Supabase Dashboard to resume the
 * configured Email Provider. Do not disable the Email Provider itself.
 */
export async function processAuthEmailHook(rawBody: string): Promise<AuthHookProcessResult> {
  const payload = parseHookPayload(rawBody);
  const action = payload.email_data.email_action_type?.trim() ?? "";

  if (!SUPPORTED_ACTIONS.has(action)) {
    return {
      ok: false,
      status: 422,
      retryable: false,
      category: "unsupported_action",
      message: `unsupported_action:${action || "missing"}`,
    };
  }

  const templateKey = templateKeyForAction(action);
  const otpType = hookActionToOtpType(action);
  if (!templateKey || !otpType) {
    return {
      ok: false,
      status: 422,
      retryable: false,
      category: "unsupported_action",
      message: "unsupported_action",
    };
  }

  let deliveries: { recipient: string; tokenHash: string; recipientRole?: "current" | "new" }[] = [{
    recipient: payload.user.email?.trim() ?? "",
    tokenHash: payload.email_data.token_hash?.trim() ?? "",
  }];
  let nextPath = safeNextFromRedirectTo(payload.email_data.redirect_to);

  if (action === "email_change") {
    deliveries = resolveEmailChangeDeliveries(payload);
    if (!deliveries.length) {
      return {
        ok: false,
        status: 422,
        retryable: false,
        category: "payload",
        message: "email_change_delivery_unresolved",
      };
    }
    if (!nextPath) nextPath = "/account";
  } else if (action === "recovery") {
    nextPath = "/reset-password";
  } else if (action === "signup") {
    // The app-provided confirmation destination is already same-origin sanitized.
    // Signup must still lead to sign-in, never directly to an authenticated page.
    if (!nextPath?.startsWith("/sign-in?confirmed=1")) nextPath = "/sign-in?confirmed=1";
  }

  if (deliveries.some(({ recipient, tokenHash }) => !recipient || !tokenHash)) {
    return {
      ok: false,
      status: 422,
      retryable: false,
      category: "payload",
      message: "missing_recipient_or_token_hash",
    };
  }

  for (const { recipient, tokenHash, recipientRole } of deliveries) {
    const actionUrl = buildAuthCallbackUrl({
      tokenHash,
      type: otpType,
      next: nextPath,
    });

    const variables = buildTemplateVariables({
      templateKey,
      actionUrl,
      userEmail: payload.user.email,
      recipientEmail: recipient,
      recipientRole,
    });

    const result = await sendEmail({
      templateKey,
      to: recipient,
      variables,
      // Signup hooks run inside the auth transaction. A FK to its uncommitted user
      // would block email logging until the hook returned, causing a timeout.
      recipientUserId: action === "signup" ? null : payload.user.id ?? null,
      channel: "auth",
      // Same token retry deduplicates; a newly issued confirmation/recovery still sends.
      // The one-way digest contains no reusable confirmation credential.
      idempotencyKey: `auth:${action}:${createHash("sha256").update(`${recipient}:${tokenHash}`).digest("hex")}`,
    });

    if (!result.ok) {
      const retryable = result.retryable ?? false;
      const status =
        result.errorCategory === "CONFIG_MISSING"
          ? 503
          : result.errorCategory === "VALIDATION"
            ? 422
            : retryable
              ? 503
              : 502;

      return {
        ok: false,
        status,
        retryable,
        category: result.errorCategory === "CONFIG_MISSING" ? "config" : "provider",
        message: "auth_email_delivery_failed",
      };
    }

  }
  return { ok: true, status: 200, retryable: false };
}

export function mapAuthHookError(err: unknown): AuthHookProcessResult {
  if (err instanceof AuthHookError) {
    return {
      ok: false,
      status: err.httpStatus,
      retryable: err.retryable,
      category: err.category,
      message: err.message,
    };
  }

  const msg = err instanceof Error ? err.message : "hook_processing_failed";
  if (msg.includes("signature") || msg.includes("Invalid signature")) {
    return { ok: false, status: 401, retryable: false, category: "signature", message: "invalid_signature" };
  }

  return { ok: false, status: 500, retryable: true, category: "provider", message: "internal_error" };
}
