import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { updateEmailSettingsRow } from "@/lib/email/cms";
import { getEmailSettings } from "@/lib/email/engine";
import { assertMaroSenderSettings } from "@/lib/email/senderValidation";
import { emailAdminErrorResponse } from "@/lib/admin/emailApi";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePermission(req, "emails.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const settings = await getEmailSettings();
  return NextResponse.json({
    fromName: settings.fromName,
    fromEmail: settings.fromEmail,
    replyTo: settings.replyTo,
    provider: settings.provider,
    productEmailEnabled: settings.productEmailEnabled,
  });
}

export async function PATCH(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePermission(req, "emails.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: {
    fromName?: string;
    fromEmail?: string;
    replyTo?: string;
    productEmailEnabled?: boolean;
    resendApiKey?: string;
    supabaseAuthHookSecret?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (body.resendApiKey != null || body.supabaseAuthHookSecret != null) {
    return NextResponse.json({ error: "secrets_not_editable" }, { status: 400 });
  }

  const current = await getEmailSettings();
  const fromName = body.fromName?.trim() ?? current.fromName;
  const fromEmail = body.fromEmail?.trim().toLowerCase() ?? current.fromEmail;
  const replyTo = body.replyTo?.trim().toLowerCase() ?? current.replyTo;
  const productEmailEnabled = body.productEmailEnabled ?? current.productEmailEnabled;

  try {
    assertMaroSenderSettings({ fromEmail, replyTo });
    await updateEmailSettingsRow({ fromName, fromEmail, replyTo, productEmailEnabled });

    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "email.settings.updated",
      targetType: "email_settings",
      targetId: "default",
      requestId: auth.requestId,
      before: {
        from_name: current.fromName,
        from_email: current.fromEmail,
        reply_to: current.replyTo,
        product_email_enabled: current.productEmailEnabled,
      },
      after: {
        from_name: fromName,
        from_email: fromEmail,
        reply_to: replyTo,
        product_email_enabled: productEmailEnabled,
      },
    });

    return NextResponse.json({
      fromName,
      fromEmail,
      replyTo,
      provider: current.provider,
      productEmailEnabled,
    });
  } catch (err) {
    return emailAdminErrorResponse(err);
  }
}
