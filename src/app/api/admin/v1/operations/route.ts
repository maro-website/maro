import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { reconcileV1AdminJob } from "@/lib/admin/v1Operations";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const auth = await requirePermission(req, "operations.view"); if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  const query = new URL(req.url).searchParams;
  const before = query.get("before") || null; const status = query.get("status") || null;
  if ((before && !Number.isFinite(Date.parse(before))) || (status && !["pending", "reserved", "processing", "completed", "failed", "cancelled"].includes(status))) return Response.json({ error: "invalid_filter" }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().rpc("admin_v1_operations", { p_before: before, p_status: status });
  if (error) return Response.json({ error: "operations_unavailable" }, { status: 503 });
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(req: Request) {
  const auth = await requirePermission(req, "security.manage"); if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  const boundedBody = await readJsonBody(req, REQUEST_LIMITS.jsonAi);
  if (!boundedBody.ok) return boundedBody.response;
  if (!boundedBody.body || typeof boundedBody.body !== "object" || Array.isArray(boundedBody.body)) return Response.json({ error: "bad-json" }, { status: 400 });
  try {
    const body = boundedBody.body as Record<string, unknown>;
    if (typeof body.jobId !== "string") return Response.json({ error: "invalid_job_id" }, { status: 400 });
    const result = await reconcileV1AdminJob(body.jobId);
    await writeAuditEvent({ actorId: auth.admin.userId, action: "v1.job.reconciled", targetType: "generation_job", targetId: body.jobId, metadata: { result }, requestId: auth.requestId });
    return Response.json({ result });
  } catch (error) { return Response.json({ error: error instanceof Error && ["invalid_job_id", "job_not_eligible"].includes(error.message) ? error.message : "reconciliation_failed" }, { status: 400 }); }
}
