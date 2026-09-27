/**
 * Engine integration policy — global flags vs per-tool pipeline.
 *
 * ## Final semantics (Phase 2B.1)
 *
 * ### `feature_flags.prompt_compiler_v2` (global)
 * Permits **Engine LIVE** provider cutover only (`production_pipeline = engine`).
 * Does NOT block shadow compilation.
 * Does NOT block dry-run admin compile.
 * Default: false — production stays legacy.
 *
 * ### `tool_engine_config.production_pipeline` (per tool)
 * - `legacy` — production uses legacy path only; no shadow compile
 * - `shadow` — legacy provider request + parallel Engine compile for comparison
 * - `engine` — future live Engine provider path (requires prompt_compiler_v2=true)
 *
 * ### Phase 2B.1 rollout constraint
 * Only `maro_web` may enter shadow. All other tools remain legacy.
 */

import type { EngineToolId, ProductionPipeline } from "./types";
import { isShadowPipeline, normalizePipeline } from "./pipelinePolicy";

export type RolloutPhase = "2a5" | "2b1" | "2b" | "build";

/** Global flag: permits sending Engine brief to provider (live cutover). */
export function isEngineLiveGloballyEnabled(promptCompilerV2: boolean): boolean {
  return promptCompilerV2;
}

/** Would this configuration send Engine output to a provider? Must be false in 2B.1. */
export function wouldUseEngineProvider(
  pipeline: ProductionPipeline,
  promptCompilerV2: boolean
): boolean {
  return pipeline === "engine" && isEngineLiveGloballyEnabled(promptCompilerV2);
}

export function shouldRunShadowCompilation(input: {
  pipeline: ProductionPipeline;
  toolId: EngineToolId;
  phase?: RolloutPhase;
  shadowFeatureFlags?: { imazh?: boolean; logo?: boolean };
}): boolean {
  if (!isShadowPipeline(input.pipeline)) return false;
  const phase = input.phase ?? "2b1";
  const flags = input.shadowFeatureFlags ?? {};

  if (input.toolId === "maro_web") {
    return phase === "2b1" || phase === "2b" || phase === "build";
  }

  if (input.toolId === "maro_imazh" && flags.imazh) {
    return phase === "build" || phase === "2b";
  }

  if (input.toolId === "maro_logo" && flags.logo) {
    return phase === "build" || phase === "2b";
  }

  return false;
}

export function canSetPipeline(
  next: ProductionPipeline,
  toolId: EngineToolId,
  phase: RolloutPhase = "2b1",
  promptCompilerV2 = false,
  shadowFeatureFlags?: { imazh?: boolean; logo?: boolean }
): { ok: boolean; error?: string } {
  if (next === "engine") {
    if (phase === "2a5" || phase === "2b1") {
      return { ok: false, error: "engine_activation_not_authorized" };
    }
    if (!isEngineLiveGloballyEnabled(promptCompilerV2)) {
      return { ok: false, error: "prompt_compiler_v2_required_for_engine_live" };
    }
  }

  if (next === "shadow") {
    if (toolId === "maro_web") return { ok: true };
    if (toolId === "maro_imazh") {
      if (!shadowFeatureFlags?.imazh) {
        return { ok: false, error: "engine_shadow_imazh_flag_required" };
      }
      return { ok: phase === "build" || phase === "2b" };
    }
    if (toolId === "maro_logo") {
      if (!shadowFeatureFlags?.logo) {
        return { ok: false, error: "engine_shadow_logo_flag_required" };
      }
      return { ok: phase === "build" || phase === "2b" };
    }
    if (phase === "2b1") {
      return { ok: false, error: "shadow_limited_to_maro_web_in_2b1" };
    }
  }

  return { ok: true };
}

export { normalizePipeline, isShadowPipeline } from "./pipelinePolicy";
