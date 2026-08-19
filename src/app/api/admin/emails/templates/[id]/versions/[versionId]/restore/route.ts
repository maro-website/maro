import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { restoreVersionToDraft } from "@/lib/email/cms";
import { emailAdminErrorResponse } from "@/lib/admin/emailApi";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string; versionId: string }> }
) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePermission(req, "emails.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id, versionId } = await ctx.params;
    const draft = await restoreVersionToDraft(id, versionId, auth.admin.userId);

    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "email.template.restored",
      targetType: "email_template_versions",
      targetId: draft.id,
      requestId: auth.requestId,
      metadata: { template_id: id, restored_from: versionId, version_label: draft.versionLabel },
    });

    return NextResponse.json({ draft });
  } catch (err) {
    return emailAdminErrorResponse(err);
  }
}
