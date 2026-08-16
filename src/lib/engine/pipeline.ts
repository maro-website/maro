import "server-only";

import { loadToolEngineConfigs } from "./storage";
import { normalizePipeline, isShadowPipeline } from "./pipelinePolicy";
import { resolveEngineToolId } from "./toolRegistry";
import type { EngineToolId, ProductionPipeline } from "./types";

export { normalizePipeline, isShadowPipeline } from "./pipelinePolicy";
export {
  canSetPipeline,
  shouldRunShadowCompilation,
  isEngineLiveGloballyEnabled,
  wouldUseEngineProvider,
} from "./engineIntegrationPolicy";

export async function getToolProductionPipeline(
  registryOrEngineId: string
): Promise<{ engineId: EngineToolId | null; pipeline: ProductionPipeline }> {
  const engineId = resolveEngineToolId(registryOrEngineId);
  if (!engineId) return { engineId: null, pipeline: "legacy" };

  const configs = await loadToolEngineConfigs();
  const tool = configs.get(engineId);
  return {
    engineId,
    pipeline: normalizePipeline(tool?.productionPipeline),
  };
}
