import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { getEmailTemplateDetail, getEmailTemplateVersion } from "@/lib/email/cms";
import { renderEmailVersion, sendRenderedEmail } from "@/lib/email/engine";
import { getPreviewSampleVariables, TEST_EMAIL_SUBJECT_PREFIX } from "@/lib/email/previewSamples";
import { emailAdminErrorResponse } from "@/lib/admin/emailApi";
import { clientIp, enforceRateLimit } from "@/lib/security/rateLimit";
import { isValidEmail } from "@/lib/security/validation";
import { isResendConfigured } from "@/lib/config/serverEnv";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePermission(req, "emails.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const ip = clientIp(req);
  const rl = await enforceRateLimit(req, "admin:email-test-send", `${auth.admin.userId}:${ip}`, 10, 3600, "strict");
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  if (!isResendConfigured()) {
    return NextResponse.json({ error: "CONFIG_MISSING", message: "Resend is not configured" }, { status: 503 });
  }

  let body: { templateId?: string; versionId?: string; to?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (!body.templateId || !body.versionId) {
    return NextResponse.json({ error: "template_id_and_version_id_required" }, { status: 400 });
  }

  const to = (body.to?.trim() || auth.admin.email).toLowerCase();
  if (!isValidEmail(to)) {
    return NextResponse.json({ error: "invalid_recipient" }, { status: 400 });
  }

  try {
    const [detail, version] = await Promise.all([
      getEmailTemplateDetail(body.templateId),
      getEmailTemplateVersion(body.versionId),
    ]);

    if (!detail || !version || version.templateId !== body.templateId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const variables = getPreviewSampleVariables(detail.templateKey);
    const rendered = await renderEmailVersion({
      templateKey: detail.templateKey,
      locale: detail.locale,
      subject: version.subject,
      previewText: version.previewText,
      content: version.content,
      variables,
    });

    const channel = detail.category === "auth" ? "auth" : "product";
    const result = await sendRenderedEmail({
      to,
      templateKey: detail.templateKey,
      rendered,
      channel,
      recipientUserId: auth.admin.userId,
      idempotencyKey: `test:${body.versionId}:${auth.admin.userId}:${Date.now()}`,
      subjectPrefix: TEST_EMAIL_SUBJECT_PREFIX,
      metadata: { test_send: true, version_id: body.versionId, version_status: version.status },
    });

    const recipientDomain = to.split("@")[1] ?? null;
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "email.template.test_sent",
      targetType: "email_template_versions",
      targetId: body.versionId,
      requestId: auth.requestId,
      metadata: {
        template_id: body.templateId,
        template_key: detail.templateKey,
        recipient_domain: recipientDomain,
        ok: result.ok,
        log_id: result.logId ?? null,
      },
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.errorCategory ?? "send_failed",
          message: result.message ?? "send_failed",
          retryable: result.retryable ?? false,
        },
        { status: result.errorCategory === "CONFIG_MISSING" ? 503 : 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      providerMessageId: result.providerMessageId,
      logId: result.logId,
      to,
    });
  } catch (err) {
    return emailAdminErrorResponse(err);
  }
}
