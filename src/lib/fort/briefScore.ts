// maroFort — Brief Strength meter. Rewards meaningfully-filled fields (weighted
// by priority) rather than merely non-empty ones.

import { getFortFields } from "./schema";
import type { FortConfig, FortModuleId, FortValue, FortValues } from "./types";

function isMeaningful(v: FortValue | undefined): boolean {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  const s = String(v).trim();
  return s.length > 1;
}

export function computeBriefStrength(
  module: FortModuleId,
  values: FortValues,
  config?: FortConfig
): { score: number; suggestion: string } {
  const fields = getFortFields(module, config);
  if (fields.length === 0) return { score: 0, suggestion: "" };

  let total = 0;
  let filled = 0;
  const missing: string[] = [];

  for (const f of fields) {
    const weight = Math.max(1, f.priority ?? 10);
    total += weight;
    if (isMeaningful(values[f.id])) {
      filled += weight;
    } else if ((f.priority ?? 0) >= 50) {
      missing.push(f.label);
    }
  }

  const score = Math.round((filled / total) * 100);
  let suggestion = "";
  if (score < 40) suggestion = "Shto më shumë detaje për rezultat më të mirë.";
  else if (missing.length) suggestion = `Provo të plotësosh: ${missing.slice(0, 2).join(", ")}.`;
  else if (score < 80) suggestion = "Brief i mirë — pak detaje shtesë do e forconin.";
  else suggestion = "Brief i fortë.";

  return { score, suggestion };
}
