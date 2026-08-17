import "server-only";

import { FEATURE_PROMPT_COMPILER_V2, isFeatureEnabled } from "@/lib/features/flags";
import { checkInternalCanaryEligibility } from "./internalCanary";
import { canExecuteEngineProvider } from "./adapters/executeGate";
import { getToolProductionPipeline } from "./pipeline";
import { isShadowPipeline } from "./pipelinePolicy";
import { shouldRunShadowCompilation } from "./engineIntegrationPolicy";
import type { ProductionPipeline } from "./types";

export type WebEffectiveExecutionMode = "legacy" | "engine_internal";

/** Operator-facing label for job/generation inspection. */
export type WebEffectiveExecutionLabel = "legacy" | "shadow_legacy" | "engine_internal";

export interface WebEffectiveExecution {
  mode: WebEffectiveExecutionMode;
  label: WebEffectiveExecutionLabel;
  configuredPipeline: ProductionPipeline;
  scheduleShadowAfterSuccess: boolean;
  internalCanary: boolean;
  promptCompilerV2: boolean;
  /** Why legacy was chosen when engine preconditions partially matched (debug only). */
  legacyReason?: string;
}

export interface ResolveWebEffectiveExecutionInput {
  configuredPipeline: ProductionPipeline;
  promptCompilerV2: boolean;
  userId: string | null;
  internalCanaryEligible: boolean;
  lookupFailed?: boolean;
}

function executionLabel(
  mode: WebEffectiveExecutionMode,
  configuredPipeline: ProductionPipeline
): WebEffectiveExecutionLabel {
  if (mode === "engine_internal") return "engine_internal";
  if (isShadowPipeline(configuredPipeline)) return "shadow_legacy";
  return "legacy";
}

/**
 * Pure server-side execution decision for maroWeb.
 * Fail closed → legacy provider path.
 */
export function resolveWebEffectiveExecution(
  input: ResolveWebEffectiveExecutionInput
): WebEffectiveExecution {
  const scheduleShadow = shouldRunShadowCompilation({
    pipeline: input.configuredPipeline,
    toolId: "maro_web",
    phase: "2b1",
  });

  const baseLegacy = (legacyReason?: string): WebEffectiveExecution => ({
    mode: "legacy",
    label: executionLabel("legacy", input.configuredPipeline),
    configuredPipeline: input.configuredPipeline,
    scheduleShadowAfterSuccess: scheduleShadow,
    internalCanary: false,
    promptCompilerV2: input.promptCompilerV2,
    legacyReason,
  });

  if (input.lookupFailed) {
    return baseLegacy("lookup_failed");
  }

  if (!input.userId) {
    return baseLegacy("unauthenticated");
  }

  const gateOk = canExecuteEngineProvider({
    toolId: "maro_web",
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

export interface WebExecutionContext extends WebEffectiveExecution {
  userId: string | null;
}

/** Load trusted server context and resolve effective maroWeb execution. */
export async function resolveWebExecutionContext(input: {
  userId: string | null;
}): Promise<WebExecutionContext> {
  let lookupFailed = false;
  let configuredPipeline: ProductionPipeline = "legacy";
  let promptCompilerV2 = false;
  let internalCanaryEligible = false;

  try {
    const { pipeline } = await getToolProductionPipeline("website");
    configuredPipeline = pipeline;
  } catch (e) {
    console.error("[engine/webExecution] pipeline lookup failed:", e);
    lookupFailed = true;
  }

  try {
    promptCompilerV2 = await isFeatureEnabled(FEATURE_PROMPT_COMPILER_V2);
  } catch (e) {
    console.error("[engine/webExecution] feature flag lookup failed:", e);
    lookupFailed = true;
  }

  if (input.userId) {
    const eligibility = await checkInternalCanaryEligibility(input.userId);
    internalCanaryEligible = eligibility.eligible;
    if (eligibility.lookupFailed) lookupFailed = true;
  }

  const resolved = resolveWebEffectiveExecution({
    configuredPipeline,
    promptCompilerV2,
    userId: input.userId,
    internalCanaryEligible,
    lookupFailed,
  });

  return { ...resolved, userId: input.userId };
}
