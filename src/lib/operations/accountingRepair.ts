import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { recordCompletedGenerationCosts } from "@/lib/generation/orchestrator";
import type { ImageProviderObservation } from "@/lib/ai/imageObservation";

/** Replays only auxiliary accounting after a committed settlement. RPC row
 * locks/markers make concurrent cron runs and transport-uncertain retries safe. */
export async function repairGenerationAccounting(): Promise<number> {
  const { data, error } = await getSupabaseAdmin().from("generation_jobs")
    .select("id,user_id,module,model,credits_charged,provider_cost_usd,input_tokens,output_tokens,metadata")
    .eq("status", "completed")
    .not("metadata", "cs", JSON.stringify({ spend_rollup_legacy: true }))
    .or("metadata->>spend_rollup_recorded_at.is.null,metadata->>provider_cost_recorded_at.is.null")
    .order("finished_at").limit(100);
  if (error) throw new Error("accounting_repair_unavailable");
  let repaired = 0;
  for (const job of data ?? []) {
    const meta = job.metadata ?? {};
    const observation = meta.execution?.image_provider as ImageProviderObservation | undefined;
    await recordCompletedGenerationCosts({ jobId: job.id, userId: job.user_id, module: job.module,
      model: job.model ?? undefined, cost: job.credits_charged, provider: meta.v1_request?.model?.provider,
      generationId: meta.v1_lifecycle?.generation_id ?? null, imageObservation: observation,
      imageCount: meta.v1_durable ? 1 : undefined,
      inputTokens: job.input_tokens ?? undefined, outputTokens: job.output_tokens ?? undefined });
    repaired++;
  }
  return repaired;
}
