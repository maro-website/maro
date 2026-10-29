import { requirePermission } from "@/lib/admin/auth";
import { hasPermission } from "@/lib/admin/permissions";
import { GenerationReviewError, validGenerationJobId } from "@/lib/admin/generationReview";
import { readGenerationResearch } from "@/lib/admin/generationResearch";
import { checkRateLimit } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization", "X-Robots-Tag": "noindex, nofollow, noarchive" };
const failure = (error: string, status: number, extra?: Record<string, string>) => Response.json({ error }, { status, headers: { ...headers, ...extra } });

export async function GET(req: Request, context: { params: Promise<{ jobId: string }> }) {
  const auth = await requirePermission(req, "generations.review");
  if (!auth.ok) return failure(auth.error, auth.status);
  if (!hasPermission(auth.admin.role, "users.view")) return failure("insufficient_permission", 403);
  const { jobId } = await context.params;
  if (!validGenerationJobId(jobId)) return failure("invalid_job_id", 400);
  try {
    const rate = await checkRateLimit("admin_generation_research", auth.admin.userId, 60, 60, "strict");
    if (!rate.allowed) return failure("rate_limited", 429, { "Retry-After": String(rate.retryAfter || 60) });
    return Response.json(await readGenerationResearch({ jobId, actorId: auth.admin.userId, requestId: auth.requestId }), { headers });
  } catch (error) {
    return error instanceof GenerationReviewError ? failure(error.code, error.status) : failure("research_unavailable", 503);
  }
}
