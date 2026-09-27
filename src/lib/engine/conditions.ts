/**
 * Safe structured condition evaluator for Engine prompt layers and input visibility.
 * Does NOT execute JavaScript or eval stored in the database.
 */

import type { CompileGenerationBriefInput, EngineCondition } from "./types";

export interface ConditionContext {
  tool: string;
  model: string;
  preset?: string;
  plan?: string;
  generationType?: string;
  fort: Record<string, unknown>;
  attachments: { exists: boolean; count: number };
  selections: Record<string, string>;
}

export function buildConditionContext(input: CompileGenerationBriefInput, model: string): ConditionContext {
  const attachments = input.attachments ?? [];
  return {
    tool: input.toolId,
    model,
    preset: input.presetId,
    plan: input.plan,
    generationType: input.generationType,
    fort: input.fort?.values ?? {},
    attachments: { exists: attachments.length > 0, count: attachments.length },
    selections: input.selections ?? {},
  };
}

function readField(ctx: ConditionContext, field: string): string | string[] | boolean | undefined {
  if (field === "tool") return ctx.tool;
  if (field === "model") return ctx.model;
  if (field === "preset") return ctx.preset;
  if (field === "plan") return ctx.plan;
  if (field === "generationType") return ctx.generationType;
  if (field === "attachments.exists") return ctx.attachments.exists;
  if (field === "attachments.count") return String(ctx.attachments.count);

  if (field.startsWith("fort.")) {
    const key = field.slice(5);
    const v = ctx.fort[key];
    if (Array.isArray(v)) return v.map(String);
    if (v != null && typeof v === "object") return undefined;
    return v == null ? undefined : String(v);
  }

  if (field.startsWith("selection.")) {
    const key = field.slice("selection.".length);
    return ctx.selections[key];
  }

  return ctx.selections[field] ?? ctx.fort[field] as string | undefined;
}

function valueToArray(v: string | string[] | boolean | undefined): string[] {
  if (v == null) return [];
  if (typeof v === "boolean") return v ? ["true"] : ["false"];
  if (Array.isArray(v)) return v.map(String);
  return [String(v)];
}

function matchesOne(cond: EngineCondition, ctx: ConditionContext): boolean {
  if (cond.exists != null) {
    const raw = readField(ctx, cond.field);
    let has: boolean;
    if (typeof raw === "boolean") {
      has = raw;
    } else if (raw == null) {
      has = false;
    } else if (Array.isArray(raw)) {
      has = raw.length > 0;
    } else {
      has = String(raw).trim().length > 0;
    }
    return cond.exists ? has : !has;
  }

  const current = valueToArray(readField(ctx, cond.field));
  if (cond.equals?.length) {
    if (!current.some((c) => cond.equals!.includes(c))) return false;
  }
  if (cond.includes?.length) {
    if (!current.some((c) => cond.includes!.includes(c))) return false;
  }
  return true;
}

/** True when no conditions, or when ANY condition matches (any-of). */
export function matchesEngineConditions(
  conditions: EngineCondition[] | undefined,
  ctx: ConditionContext
): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.some((c) => matchesOne(c, ctx));
}
