import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { publishDraftVersion } from "@/lib/email/cms";
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
    const published = await publishDraftVersion(id, versionId, auth.admin.userId);

    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "email.template.published",
      targetType: "email_template_versions",
      targetId: versionId,
      requestId: auth.requestId,
      metadata: { template_id: id, version_label: published.versionLabel },
    });

    return NextResponse.json({ version: published });
  } catch (err) {
    return emailAdminErrorResponse(err);
  }
}
