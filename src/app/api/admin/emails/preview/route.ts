import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { getEmailTemplateDetail, getEmailTemplateVersion } from "@/lib/email/cms";
import { renderEmailVersion } from "@/lib/email/engine";
import { getPreviewSampleVariables } from "@/lib/email/previewSamples";
import { emailAdminErrorResponse } from "@/lib/admin/emailApi";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePermission(req, "emails.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { templateId?: string; versionId?: string };
  const boundedBody = await readJsonBody(req, REQUEST_LIMITS.jsonAi);
  if (!boundedBody.ok) return boundedBody.response;
  if (!boundedBody.body || typeof boundedBody.body !== "object" || Array.isArray(boundedBody.body)) return NextResponse.json({ error: "bad-json" }, { status: 400 });
  try {
    body = boundedBody.body as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (!body.templateId || !body.versionId) {
    return NextResponse.json({ error: "template_id_and_version_id_required" }, { status: 400 });
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

    return NextResponse.json({
      subject: rendered.subject,
      previewText: rendered.previewText,
      html: rendered.html,
      text: rendered.text,
      sampleVariables: variables,
    });
  } catch (err) {
    return emailAdminErrorResponse(err);
  }
}
