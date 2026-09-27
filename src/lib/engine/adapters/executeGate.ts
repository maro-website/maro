import { wouldUseEngineProvider } from "../engineIntegrationPolicy";
import type { ProductionPipeline } from "../types";
import type { EngineExecutionGateInput } from "./types";

/**
 * Production Engine provider execution gate.
 * Requires global LIVE permission, engine pipeline, authenticated user,
 * and explicit internal-canary allowlist eligibility.
 */
export function canExecuteEngineProvider(input: EngineExecutionGateInput): boolean {
  const pipeline = input.pipeline as ProductionPipeline;
  if (!wouldUseEngineProvider(pipeline, input.promptCompilerV2)) {
    return false;
  }
  if (!input.userId) return false;
  if (input.internalCanaryEligible !== true) return false;
  return true;
}

export function assertEngineProviderExecutionBlocked(input: EngineExecutionGateInput): void {
  if (canExecuteEngineProvider(input)) {
    throw new Error("engine_provider_execution_not_authorized");
  }
}

/** Safe wrapper — maps brief but never calls provider unless gate passes. */
export async function executeEngineProviderIfAuthorized<T>(
  input: EngineExecutionGateInput,
  run: () => Promise<T>
): Promise<{ executed: false; reason: string } | { executed: true; result: T }> {
  if (!canExecuteEngineProvider(input)) {
    return { executed: false, reason: "engine_provider_execution_blocked" };
  }
  return { executed: true, result: await run() };
}
