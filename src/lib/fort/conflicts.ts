// maroFort — non-blocking conflict detection. Returns human-readable warnings
// shown before generation; never blocks. Extend with more heuristics over time.

import type { FortValues } from "./types";

function has(v: unknown, needle: string): boolean {
  if (v == null) return false;
  const arr = Array.isArray(v) ? v.map(String) : [String(v)];
  return arr.some((s) => s.toLowerCase().includes(needle));
}

export function detectConflicts(values: FortValues): string[] {
  const warnings: string[] = [];

  // Minimal style but asking for busy/maximalist content.
  const minimal =
    has(values.designStyle, "minimal") ||
    has(values.aesthetic, "minimal") ||
    has(values.visualStyle, "minimal");
  const manySections =
    has(values.sections, "stats") &&
    has(values.sections, "team") &&
    has(values.sections, "pricing");
  const busy =
    has(values.mustInclude, "maksimal") ||
    has(values.mustInclude, "shumë elemente") ||
    manySections;
  if (minimal && busy) {
    warnings.push("Stili minimal bie ndesh me kërkesën për shumë elemente.");
  }

  // Monochrome logo but a vibrant color approach.
  if (has(values.colorApproach, "monochrome") && has(values.mustInclude, "ngjyra")) {
    warnings.push("Zgjodhe monokrom, por kërkon ngjyra në 'Duhet të përmbajë'.");
  }

  // No text in image but a headline provided.
  const hasHeadline = typeof values.headline === "string" && values.headline.trim().length > 0;
  if (has(values.includeText, "no") && hasHeadline) {
    warnings.push("Ke çaktivizuar tekstin, por ke shkruar një titull.");
  }

  return warnings;
}
