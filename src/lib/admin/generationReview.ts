import "server-only";

import sharp from "sharp";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { detectRasterKind, MAX_GENERATED_IMAGE_BYTES, mimeForKind } from "@/lib/security/uploadValidation";

export type GenerationImageVariant = "thumbnail" | "original";
export class GenerationReviewError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}
export const validGenerationJobId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/** Read only the retained output linked to this V1 job's current history record. */
export async function readGenerationReviewImage(input: { jobId: string; actorId: string; requestId: string; variant: GenerationImageVariant }) {
  if (!validGenerationJobId(input.jobId)) throw new GenerationReviewError(400, "invalid_job_id");
  const db = getSupabaseAdmin();
  const jobResult = await db.from("generation_jobs").select("id,user_id,metadata").eq("id", input.jobId).maybeSingle();
  if (jobResult.error) throw new GenerationReviewError(503, "review_unavailable");
  const job = jobResult.data;
  if (!job || !validGenerationJobId(job.user_id) || job.metadata?.v1_durable !== true || !["maro_imazh", "maro_logo"].includes(job.metadata?.v1_request?.module)) {
    throw new GenerationReviewError(404, "image_unavailable");
  }
  const path = `${job.user_id}/${input.jobId}/output.png`;
  const generationResult = await db.from("generations").select("id,output_urls").eq("job_id", input.jobId).eq("user_id", job.user_id).maybeSingle();
  if (generationResult.error) throw new GenerationReviewError(503, "review_unavailable");
  const generation = generationResult.data;
  // Never resurrect a deleted result, inspect reference uploads, or accept caller-supplied storage paths.
  if (!generation || !Array.isArray(generation.output_urls) || !generation.output_urls.includes(`storage:generations/${path}`)) {
    throw new GenerationReviewError(404, "image_unavailable");
  }
  const stored = await db.storage.from("generations").download(path);
  if (stored.error || !stored.data) throw new GenerationReviewError(404, "image_unavailable");
  if (stored.data.size === 0 || stored.data.size > MAX_GENERATED_IMAGE_BYTES) throw new GenerationReviewError(422, "invalid_image");
  let bytes = Buffer.from(await stored.data.arrayBuffer());
  const kind = detectRasterKind(bytes);
  if (!kind) throw new GenerationReviewError(422, "invalid_image");
  let contentType = mimeForKind(kind);
  let extension: string = kind === "jpeg" ? "jpg" : kind;
  try {
    const image = sharp(bytes, { limitInputPixels: 40_000_000, sequentialRead: true });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) throw new Error("invalid_dimensions");
    if (input.variant === "thumbnail") {
      bytes = await image.rotate().resize(96, 96, { fit: "inside", withoutEnlargement: true }).webp({ quality: 70 }).toBuffer();
      contentType = "image/webp";
      extension = "webp";
    }
  } catch { throw new GenerationReviewError(422, "invalid_image"); }
  // Fail closed: private pixels are never returned if the access event could not be recorded.
  const audit = await db.from("audit_events").insert({
    actor_id: input.actorId, action: "v1.generation_image.viewed", target_type: "generation_job", target_id: input.jobId,
    request_id: input.requestId, metadata: { purpose: "quality_review", variant: input.variant, generationId: generation.id },
  });
  if (audit.error) throw new GenerationReviewError(503, "review_audit_unavailable");
  return { bytes: new Uint8Array(bytes), contentType, extension };
}
