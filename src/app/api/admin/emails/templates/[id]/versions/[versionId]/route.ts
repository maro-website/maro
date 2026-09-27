import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { getEmailTemplateDetail, updateDraftVersion } from "@/lib/email/cms";
import { emailAdminErrorResponse } from "@/lib/admin/emailApi";
import type { EmailStructuredContent } from "@/lib/email/types";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; versionId: string }> }
) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePermission(req, "emails.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: {
    subject?: string;
    previewText?: string;
    content?: EmailStructuredContent;
    changeNote?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (!body.subject?.trim() || !body.content) {
    return NextResponse.json({ error: "subject_and_content_required" }, { status: 400 });
  }

  try {
    const { id, versionId } = await ctx.params;
    const detail = await getEmailTemplateDetail(id);
    if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const updated = await updateDraftVersion(
      versionId,
      {
        subject: body.subject,
        previewText: body.previewText ?? "",
        content: body.content,
        changeNote: body.changeNote,
      },
      detail.templateKey
    );

    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "email.template.draft_updated",
      targetType: "email_template_versions",
      targetId: versionId,
      requestId: auth.requestId,
      metadata: { template_id: id, version_label: updated.versionLabel },
    });

    return NextResponse.json({ version: updated });
  } catch (err) {
    return emailAdminErrorResponse(err);
  }
}
