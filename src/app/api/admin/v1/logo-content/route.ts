import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { loadLogoContent } from "@/lib/marologo/contentServer";
import { validateLogoContent } from "@/lib/marologo/content";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const auth = await requirePermission(req, "engine.view"); if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  try { return Response.json({ content: await loadLogoContent() }); } catch { return Response.json({ error: "logo_content_unavailable" }, { status: 503 }); }
}
export async function PUT(req: Request) {
  const auth = await requirePermission(req, "engine.manage"); if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  const boundedBody = await readJsonBody(req, REQUEST_LIMITS.jsonAi);
  if (!boundedBody.ok) return boundedBody.response;
  if (!boundedBody.body || typeof boundedBody.body !== "object" || Array.isArray(boundedBody.body)) return Response.json({ error: "bad-json" }, { status: 400 });
  try {
    const content = validateLogoContent((boundedBody.body as Record<string, unknown>).content);
    const { error, data } = await getSupabaseAdmin().from("app_settings").update({ logo_wizard_content: content }).eq("id", 1).select("id").single();
    if (error || !data) return Response.json({ error: "logo_content_save_failed" }, { status: 503 });
    await writeAuditEvent({ actorId: auth.admin.userId, action: "v1.logo_content.saved", targetType: "module", targetId: "maro_logo", requestId: auth.requestId });
    return Response.json({ content });
  } catch { return Response.json({ error: "invalid_logo_content" }, { status: 400 }); }
}
