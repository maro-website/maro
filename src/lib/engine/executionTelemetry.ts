import "server-only";

import { getJob, updateJob } from "@/lib/generation/jobs";
import type { ProductionPipeline } from "./types";
import type { WebEffectiveExecutionLabel } from "./webExecution";

export type EffectiveExecutionLabel = WebEffectiveExecutionLabel;

export type WebEngineFailureStage =
  | "eligibility"
  | "compile"
  | "map"
  | "provider"
  | "parse"
  | "persistence"
  | "credit";

export type ImageEngineFailureStage = WebEngineFailureStage;

export interface GenerationExecutionTelemetry {
  configured_pipeline: ProductionPipeline;
  effective_execution: EffectiveExecutionLabel;
  compiler: "legacy" | "maro_engine_v1" | null;
  system_prompt_version?: string | null;
  system_prompt_status?: string | null;
  model?: string | null;
  provider?: "anthropic" | "openai" | null;
  internal_canary: boolean;
  provider_request_count: number;
  total_latency_ms?: number | null;
  provider_latency_ms?: number | null;
  success?: boolean;
  failure_stage?: WebEngineFailureStage | null;
  error_code?: string | null;
  generation_id?: string | null;
  /** maroImazh image execution fields — safe metadata only. */
  module?: string | null;
  operation?: "generate" | "edit" | null;
  image_size?: string | null;
  image_quality?: string | null;
  image_n?: number | null;
  reference_count_received?: number | null;
  reference_count_usable?: number | null;
  reference_count_used?: number | null;
  reference_source_types?: string[] | null;
  text_mode?: "on" | "off" | null;
  fort_enabled?: boolean | null;
  brain_used?: boolean | null;
  preset_present?: boolean | null;
  /** ISO timestamp when execution decision + initial stamp were persisted. */
  execution_started_at?: string | null;
}

export function buildInitialExecutionTelemetry(input: {
  configuredPipeline: ProductionPipeline;
  effectiveExecution: EffectiveExecutionLabel;
  internalCanary: boolean;
  model: string;
  compiler?: GenerationExecutionTelemetry["compiler"];
  provider?: GenerationExecutionTelemetry["provider"];
  module?: string;
  operation?: GenerationExecutionTelemetry["operation"];
  executionStartedAt?: string;
}): GenerationExecutionTelemetry {
  return {
    configured_pipeline: input.configuredPipeline,
    effective_execution: input.effectiveExecution,
    compiler: input.compiler ?? (input.effectiveExecution === "engine_internal" ? "maro_engine_v1" : "legacy"),
    model: input.model,
    provider: input.provider ?? (input.module === "reklama" || input.module === "maro_logo" ? "openai" : "anthropic"),
    internal_canary: input.internalCanary,
    provider_request_count: 0,
    module: input.module ?? null,
    operation: input.operation ?? null,
    success: false,
    execution_started_at: input.executionStartedAt ?? new Date().toISOString(),
  };
}

export async function stampJobExecutionTelemetry(
  jobId: string,
  patch: Partial<GenerationExecutionTelemetry>
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) return;

  const prev = (job.metadata?.execution ?? {}) as Partial<GenerationExecutionTelemetry>;
  const execution: GenerationExecutionTelemetry = {
    configured_pipeline: prev.configured_pipeline ?? "legacy",
    effective_execution: prev.effective_execution ?? "legacy",
    compiler: prev.compiler ?? "legacy",
    internal_canary: prev.internal_canary ?? false,
    provider_request_count: prev.provider_request_count ?? 0,
    provider: prev.provider ?? "anthropic",
    ...patch,
  };

  await updateJob(jobId, {
    metadata: {
      ...job.metadata,
      execution,
    },
  });
}
