// maroFort — prompt layer selection. Layers are admin-defined reusable prompt
// fragments (universal or per-module). We only inject the relevant ones per
// request, ordered by priority; never send every layer every time.

import { matchesConditions } from "./conditions";
import type { FortConfig, FortModuleId, FortPromptLayer, FortValues } from "./types";

export function selectLayers(
  config: FortConfig | undefined,
  module: FortModuleId,
  values: FortValues
): FortPromptLayer[] {
  const layers = config?.promptLayers ?? [];
  return layers
    .filter((l) => l.enabled !== false)
    .filter((l) => l.module === "universal" || l.module === module)
    .filter((l) => matchesConditions(l.when, values))
    .filter((l) => (l.content ?? "").trim().length > 0)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}
