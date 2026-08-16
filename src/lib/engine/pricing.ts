/**
 * Engine pricing preview — reuses registry cost logic (source of truth).
 */

import {
  getTool,
  toolSelectionCostBreakdown,
  type ToolSelections,
} from "@/lib/tools/registry";
import type { CreditEstimate, EngineToolId } from "./types";
import { getRegistryToolId } from "./toolRegistry";

export function estimateGenerationCredits(
  toolId: EngineToolId,
  selections: ToolSelections,
  pricingOverrides?: Record<string, number>
): CreditEstimate {
  const registryId = getRegistryToolId(toolId);
  const tool = getTool(registryId);
  if (!tool) return { total: 0, lines: [] };
  return toolSelectionCostBreakdown(tool, selections, pricingOverrides);
}
