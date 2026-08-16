import { wouldUseEngineProvider } from "../engineIntegrationPolicy";
import type { ProductionPipeline } from "../types";
import type { EngineExecutionGateInput } from "./types";

/**
 * Production Engine provider execution gate.
 * Returns false while prompt_compiler_v2=false OR pipeline!=engine.
 * Adapters may be built and tested; this gate blocks live provider calls.
 */
export function canExecuteEngineProvider(input: EngineExecutionGateInput): boolean {
  const pipeline = input.pipeline as ProductionPipeline;
  return wouldUseEngineProvider(pipeline, input.promptCompilerV2);
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
