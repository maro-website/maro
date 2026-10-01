import { createHash } from "node:crypto";
import { estimateV1ImageCost, type V1ImageCostEstimate } from "@/lib/cost/v1ImageCost";

export interface ImageProviderObservation {
  provider: "openai";
  requestedModel: string;
  reportedModel: string | null;
  requestId: string | null;
  operation: "generate" | "edit";
  startedAt: string;
  completedAt: string;
  latencyMs: number;
  promptSha256: string;
  promptCharacters: number;
  size: string;
  quality: string;
  imageCount: number;
  referenceCount: number;
  response: Record<string, unknown>;
  usage: Record<string, unknown> | null;
  estimate: V1ImageCostEstimate;
  /** Current Images API has no documented direct monetary cost field. */
  providerReportedCostUsd: null;
  error: { code: string | null; message: string; status: number | null } | null;
}
export type ImageObservationCallback = (observation: ImageProviderObservation) => void | Promise<void>;

export function buildImageObservation(input: {
  model: string; prompt: string; size?: string; quality?: string; n?: number;
  operation: "generate" | "edit"; referenceCount: number; startedAt: string;
  response?: Record<string, unknown>; error?: unknown;
}): ImageProviderObservation {
  const response = input.response ?? {};
  const error = input.error as { code?: string; message?: string; detail?: string; status?: number; request_id?: string; providerCode?: string; requestId?: string } | undefined;
  const usage = response.usage && typeof response.usage === "object" && !Array.isArray(response.usage)
    ? JSON.parse(JSON.stringify(response.usage)) as Record<string, unknown> : null;
  const completedAt = new Date().toISOString();
  const safeResponse = Object.fromEntries(["created", "size", "quality", "output_format", "background"].filter((key) => response[key] != null).map((key) => [key, response[key]]));
  return {
    provider: "openai", requestedModel: input.model,
    reportedModel: typeof response.model === "string" ? response.model : null,
    requestId: typeof response._request_id === "string" ? response._request_id : error?.requestId ?? error?.request_id ?? null,
    operation: input.operation, startedAt: input.startedAt, completedAt,
    latencyMs: Date.parse(completedAt) - Date.parse(input.startedAt),
    promptSha256: createHash("sha256").update(input.prompt).digest("hex"), promptCharacters: input.prompt.length,
    size: input.size ?? "1024x1024", quality: input.quality ?? "high", imageCount: input.n ?? 1,
    referenceCount: input.referenceCount, response: safeResponse, usage,
    estimate: estimateV1ImageCost(input.model, usage), providerReportedCostUsd: null,
    error: error ? {
      code: error.providerCode ?? error.code ?? null,
      message: String(error.detail || error.message || "provider_failed").replace(/sk-[a-zA-Z0-9_-]+/g, "[redacted]").slice(0, 1500),
      status: error.status ?? null,
    } : null,
  };
}
