/**
 * Deterministic structural diff between legacy and Engine snapshots.
 */

import type { ShadowComparisonSnapshot, ShadowStructuralDiff, StructuralDiffSection } from "./types";

function norm(v?: string): string {
  return (v ?? "").replace(/\s+/g, " ").trim();
}

function compareSection(
  key: string,
  label: string,
  legacy?: string,
  engine?: string
): StructuralDiffSection {
  const l = norm(legacy);
  const e = norm(engine);
  if (!l && !e) return { key, label, legacy, engine, status: "same" };
  if (l && !e) return { key, label, legacy, engine, status: "legacy_only" };
  if (!l && e) return { key, label, legacy, engine, status: "engine_only" };
  if (l === e) return { key, label, legacy, engine, status: "same" };
  return { key, label, legacy, engine, status: "different" };
}

export function buildStructuralDiff(
  legacy: ShadowComparisonSnapshot,
  engine: ShadowComparisonSnapshot
): ShadowStructuralDiff {
  const sections: StructuralDiffSection[] = [
    compareSection("system", "System Instructions", legacy.systemInstructions, engine.systemInstructions),
    compareSection("user", "User Request", legacy.userContent, engine.userContent),
    compareSection("brain", "maroBrain Context", legacy.brainSections?.join(", "), engine.brainSections?.join(", ")),
    compareSection(
      "fort",
      "maroFort",
      legacy.fortValues ? JSON.stringify(legacy.fortValues) : undefined,
      engine.fortValues ? JSON.stringify(engine.fortValues) : undefined
    ),
    compareSection(
      "layers",
      "Prompt Layers",
      legacy.appliedLayers?.map((l) => l.name).join(", "),
      engine.appliedLayers?.map((l) => l.name).join(", ")
    ),
    compareSection("model", "Model", legacy.model, engine.model),
    compareSection(
      "pricing",
      "Estimated Credits",
      legacy.estimatedCredits != null ? String(legacy.estimatedCredits) : undefined,
      engine.estimatedCredits != null ? String(engine.estimatedCredits) : undefined
    ),
    compareSection("systemVersion", "System Prompt Version", legacy.systemPromptVersion, engine.systemPromptVersion),
  ];

  const warnings: string[] = [];
  for (const s of sections) {
    if (s.status === "different") warnings.push(`${s.label} differs between legacy and Engine`);
    if (s.status === "legacy_only") warnings.push(`${s.label} present in legacy only`);
    if (s.status === "engine_only") warnings.push(`${s.label} present in Engine only`);
  }

  return { sections, warnings };
}

export function snapshotFromEngineBrief(
  brief: import("./types").CompiledGenerationBrief
): ShadowComparisonSnapshot {
  return {
    systemInstructions: brief.providerMessages?.systemInstructions ?? "",
    userContent: brief.providerMessages?.userContent ?? brief.primaryUserRequest,
    brainSections: brief.metadata.brainSections,
    fortValues: brief.fort?.values as Record<string, unknown> | undefined,
    appliedLayers: brief.appliedLayers,
    model: brief.model,
    estimatedCredits: brief.estimatedCredits?.total,
    systemPromptVersion: brief.systemPromptVersion.versionLabel,
    outputRequirements: brief.outputRequirements,
    restrictions: brief.restrictions,
    attachmentsMeta: brief.providerMessages?.attachments,
    selections: brief.metadata.selections,
    renderedPreview: brief.renderedProviderPrompt,
    providerMessages: brief.providerMessages,
  };
}
