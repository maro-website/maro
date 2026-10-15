import { requirePermission } from "@/lib/admin/auth";
import { GenerationReviewError, readGenerationReviewImage, validGenerationJobId } from "@/lib/admin/generationReview";
import { checkRateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0", "Vary": "Authorization", "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "same-origin", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer",
};
const failure = (error: string, status: number, extra?: Record<string, string>) => Response.json({ error }, { status, headers: { ...privateHeaders, ...extra } });

export async function GET(req: Request, context: { params: Promise<{ jobId: string }> }) {
  const auth = await requirePermission(req, "generations.review");
  if (!auth.ok) return failure(auth.error, auth.status);
  const { jobId } = await context.params;
  const variant = new URL(req.url).searchParams.get("variant") ?? "thumbnail";
  if (!validGenerationJobId(jobId) || !["thumbnail", "original"].includes(variant)) return failure("invalid_review_request", 400);
  try {
    const rate = await checkRateLimit("admin_generation_review", auth.admin.userId, 120, 60, "strict");
    if (!rate.allowed) return failure("rate_limited", 429, { "Retry-After": String(rate.retryAfter || 60) });
    const image = await readGenerationReviewImage({ jobId, actorId: auth.admin.userId, requestId: auth.requestId, variant: variant as "thumbnail" | "original" });
    return new Response(image.bytes, { headers: {
      ...privateHeaders, "Content-Type": image.contentType,
      "Content-Disposition": `inline; filename="maro-generation-${jobId}.${image.extension}"`,
    } });
  } catch (error) {
    return error instanceof GenerationReviewError ? failure(error.code, error.status) : failure("review_unavailable", 503);
  }
}
