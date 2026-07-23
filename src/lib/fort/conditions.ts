// maroFort — condition evaluation shared by field visibility and layer selection.

import type { FortCondition, FortValue, FortValues } from "./types";

function valueToArray(v: FortValue | undefined): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "object") return [];
  return [String(v)];
}

function matchesOne(cond: FortCondition, values: FortValues): boolean {
  const current = valueToArray(values[cond.field]);
  if (cond.equals?.length) {
    if (!current.some((c) => cond.equals!.includes(c))) return false;
  }
  if (cond.includes?.length) {
    if (!current.some((c) => cond.includes!.includes(c))) return false;
  }
  return true;
}

// True when no conditions are given, or when ANY condition matches (any-of).
export function matchesConditions(
  conditions: FortCondition[] | undefined,
  values: FortValues
): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.some((c) => matchesOne(c, values));
}
