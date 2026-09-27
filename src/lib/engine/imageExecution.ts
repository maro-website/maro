import "server-only";

import { FEATURE_PROMPT_COMPILER_V2, getShadowFeatureFlags, isFeatureEnabled } from "@/lib/features/flags";
import { checkInternalCanaryEligibility } from "./internalCanary";
import { canExecuteEngineProvider } from "./adapters/executeGate";
import { getToolProductionPipeline } from "./pipeline";
import { isShadowPipeline } from "./pipelinePolicy";
import { shouldRunShadowCompilation } from "./engineIntegrationPolicy";
import { resolveImageEngineToolId } from "./imageShadowRuntime";
import type { EngineToolId, ProductionPipeline } from "./types";

export type ImageEffectiveExecutionMode = "legacy" | "engine_internal";

/** Operator-facing label for job/generation inspection. */
export type ImageEffectiveExecutionLabel = "legacy" | "shadow_legacy" | "engine_internal";

export interface ImageEffectiveExecution {
  mode: ImageEffectiveExecutionMode;
  label: ImageEffectiveExecutionLabel;
  configuredPipeline: ProductionPipeline;
  scheduleShadowAfterSuccess: boolean;
  internalCanary: boolean;
  promptCompilerV2: boolean;
  engineToolId: EngineToolId;
  /** Why legacy was chosen when engine preconditions partially matched (debug only). */
  legacyReason?: string;
}

export interface ResolveImageEffectiveExecutionInput {
  configuredPipeline: ProductionPipeline;
  promptCompilerV2: boolean;
  userId: string | null;
  internalCanaryEligible: boolean;
  scheduleShadowAfterSuccess: boolean;
  engineToolId: EngineToolId;
  lookupFailed?: boolean;
}

function executionLabel(
  mode: ImageEffectiveExecutionMode,
  configuredPipeline: ProductionPipeline
): ImageEffectiveExecutionLabel {
  if (mode === "engine_internal") return "engine_internal";
  if (isShadowPipeline(configuredPipeline)) return "shadow_legacy";
  return "legacy";
}

/**
 * Pure server-side execution decision for maroImazh / maroLogo image tools.
 * Fail closed → legacy provider path.
 */
export function resolveImageEffectiveExecution(
  input: ResolveImageEffectiveExecutionInput
): ImageEffectiveExecution {
  const baseLegacy = (legacyReason?: string): ImageEffectiveExecution => ({
    mode: "legacy",
    label: executionLabel("legacy", input.configuredPipeline),
    configuredPipeline: input.configuredPipeline,
    scheduleShadowAfterSuccess: input.scheduleShadowAfterSuccess,
    internalCanary: false,
    promptCompilerV2: input.promptCompilerV2,
    engineToolId: input.engineToolId,
    legacyReason,
  });

  if (input.lookupFailed) {
    return baseLegacy("lookup_failed");
  }

  if (!input.userId) {
    return baseLegacy("unauthenticated");
  }

  const gateOk = canExecuteEngineProvider({
    toolId: input.engineToolId,
    pipeline: input.configuredPipeline,
    promptCompilerV2: input.promptCompilerV2,
    userId: input.userId,
    internalCanaryEligible: input.internalCanaryEligible,
  });

  if (gateOk) {
    return {
      mode: "engine_internal",
      label: "engine_internal",
      configuredPipeline: input.configuredPipeline,
      scheduleShadowAfterSuccess: false,
      internalCanary: true,
      promptCompilerV2: input.promptCompilerV2,
      engineToolId: input.engineToolId,
    };
  }

  if (input.configuredPipeline === "engine" && input.promptCompilerV2 && !input.internalCanaryEligible) {
    return baseLegacy("not_internal_canary_eligible");
  }

  if (input.configuredPipeline === "engine" && !input.promptCompilerV2) {
    return baseLegacy("prompt_compiler_v2_disabled");
  }

  if (input.configuredPipeline === "shadow") {
    return baseLegacy("shadow_compile_only");
  }

  return baseLegacy("legacy_pipeline");
}

export interface ImageExecutionContext extends ImageEffectiveExecution {
  userId: string | null;
}

/** Load trusted server context and resolve effective maroImazh image execution. */
export async function resolveImageExecutionContext(input: {
  userId: string | null;
  registryToolId: string;
}): Promise<ImageExecutionContext> {
  const engineToolId = resolveImageEngineToolId(input.registryToolId);
  let lookupFailed = false;
  let configuredPipeline: ProductionPipeline = "legacy";
  let promptCompilerV2 = false;
  let internalCanaryEligible = false;
  let scheduleShadowAfterSuccess = false;

  try {
    const { pipeline } = await getToolProductionPipeline(input.registryToolId);
    configuredPipeline = pipeline;
  } catch (e) {
    console.error("[engine/imageExecution] pipeline lookup failed:", e);
    lookupFailed = true;
  }

  try {
    promptCompilerV2 = await isFeatureEnabled(FEATURE_PROMPT_COMPILER_V2);
  } catch (e) {
    console.error("[engine/imageExecution] feature flag lookup failed:", e);
    lookupFailed = true;
  }

  try {
    const shadowFlags = await getShadowFeatureFlags();
    scheduleShadowAfterSuccess = shouldRunShadowCompilation({
      pipeline: configuredPipeline,
      toolId: engineToolId,
      phase: "build",
      shadowFeatureFlags: shadowFlags,
    });
  } catch (e) {
    console.error("[engine/imageExecution] shadow policy lookup failed:", e);
    lookupFailed = true;
  }

  if (input.userId) {
    const eligibility = await checkInternalCanaryEligibility(input.userId);
    internalCanaryEligible = eligibility.eligible;
    if (eligibility.lookupFailed) lookupFailed = true;
  }

  const resolved = resolveImageEffectiveExecution({
    configuredPipeline,
    promptCompilerV2,
    userId: input.userId,
    internalCanaryEligible,
    scheduleShadowAfterSuccess,
    engineToolId,
    lookupFailed,
  });

  return { ...resolved, userId: input.userId };
}
