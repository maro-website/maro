import type { ProductionPipeline } from "./types";

/** Normalize DB pipeline values. */
export function normalizePipeline(value: string | null | undefined): ProductionPipeline {
  if (value === "shadow") return "shadow";
  if (value === "engine" || value === "engine_v2") return "engine";
  return "legacy";
}

export function isShadowPipeline(pipeline: ProductionPipeline): boolean {
  return pipeline === "shadow";
}

/** @deprecated Use engineIntegrationPolicy.canSetPipeline */
export function canSetPipeline(
  next: ProductionPipeline,
  phase: "2a5" | "2b" = "2a5"
): { ok: boolean; error?: string } {
  if (next === "engine" && phase === "2a5") {
    return { ok: false, error: "engine_activation_requires_phase_2b" };
  }
  return { ok: true };
}
