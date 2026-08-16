/**
 * maroWeb-specific structural shadow diff with deterministic classifications.
 */

import type {
  ShadowComparisonSnapshot,
  ShadowStructuralDiff,
  StructuralDiffSection,
} from "./types";

export type DiffClassification =
  | "match"
  | "expected_structural_difference"
  | "missing_in_engine"
  | "engine_only"
  | "conflict"
  | "warning";

export interface WebDiffSection extends StructuralDiffSection {
  classification: DiffClassification;
  critical?: boolean;
}

export interface WebShadowStructuralDiff extends ShadowStructuralDiff {
  sections: WebDiffSection[];
  criticalFlags: string[];
  hasCriticalMismatch: boolean;
}

function norm(v?: string): string {
  return (v ?? "").replace(/\s+/g, " ").trim();
}

function classifySection(
  key: string,
  label: string,
  legacy?: string,
  engine?: string,
  opts?: { expectedDifferent?: boolean }
): WebDiffSection {
  const l = norm(legacy);
  const e = norm(engine);
  let status: StructuralDiffSection["status"] = "same";
  let classification: DiffClassification = "match";
  let critical = false;

  if (!l && !e) {
    status = "same";
    classification = "match";
  } else if (l && !e) {
    status = "legacy_only";
    classification = "missing_in_engine";
    critical = ["system", "user", "websiteType", "output"].includes(key);
  } else if (!l && e) {
    status = "engine_only";
    classification = "engine_only";
  } else if (l === e) {
    status = "same";
    classification = "match";
  } else if (opts?.expectedDifferent) {
    status = "different";
    classification = "expected_structural_difference";
  } else {
    status = "different";
    classification = "warning";
    if (key === "system" || key === "user") classification = "conflict";
  }

  return { key, label, legacy, engine, status, classification, critical };
}

export function buildWebStructuralDiff(
  legacy: ShadowComparisonSnapshot,
  engine: ShadowComparisonSnapshot,
  context?: {
    fortEnabled?: boolean;
    websiteType?: string;
    compileError?: string;
  }
): WebShadowStructuralDiff {
  const sections: WebDiffSection[] = [
    classifySection("system", "System Behavior", legacy.systemInstructions, engine.systemInstructions),
    classifySection("user", "Primary User Request", legacy.userContent, engine.userContent),
    classifySection(
      "brain",
      "Business / Brain Context",
      legacy.brainSections?.join(", "),
      engine.brainSections?.join(", ")
    ),
    classifySection(
      "fort",
      "maroFort",
      legacy.fortValues ? JSON.stringify(legacy.fortValues) : undefined,
      engine.fortValues ? JSON.stringify(engine.fortValues) : undefined
    ),
    classifySection(
      "attachments",
      "Attachments / References",
      legacy.attachmentsMeta ? JSON.stringify(legacy.attachmentsMeta) : undefined,
      engine.attachmentsMeta ? JSON.stringify(engine.attachmentsMeta) : undefined
    ),
    classifySection(
      "websiteType",
      "Website Type",
      legacy.websiteType,
      engine.websiteType ?? context?.websiteType
    ),
    classifySection(
      "output",
      "Layout / Output Requirements",
      legacy.outputRequirements,
      engine.outputRequirements
    ),
    classifySection(
      "layers",
      "Prompt Layers",
      legacy.appliedLayers?.map((l) => l.name).join(", "),
      engine.appliedLayers?.map((l) => l.name).join(", ")
    ),
    classifySection("restrictions", "Restrictions", legacy.restrictions, engine.restrictions),
    classifySection(
      "model",
      "Model Parameters",
      legacy.model,
      engine.model
    ),
    classifySection(
      "pricing",
      "Pricing",
      legacy.estimatedCredits != null ? String(legacy.estimatedCredits) : undefined,
      engine.estimatedCredits != null ? String(engine.estimatedCredits) : undefined
    ),
    classifySection(
      "systemVersion",
      "System Prompt Version",
      legacy.systemPromptVersion,
      engine.systemPromptVersion
    ),
  ];

  const criticalFlags: string[] = [];
  const warnings: string[] = [];

  if (context?.compileError) {
    criticalFlags.push("engine_compile_failed");
  }

  if (legacy.brainSections?.length && !engine.brainSections?.length) {
    criticalFlags.push("legacy_brain_missing_in_engine");
  }

  if (context?.fortEnabled && !engine.fortValues && !norm(engine.restrictions)) {
    criticalFlags.push("fort_enabled_engine_empty");
  }

  if (context?.websiteType && !norm(engine.websiteType ?? engine.metadata?.websiteType as string)) {
    criticalFlags.push("website_type_missing_in_engine");
  }

  const legacyUser = norm(legacy.userContent);
  const engineUser = norm(engine.userContent);
  if (legacyUser && (!engineUser || engineUser.length < legacyUser.length * 0.5)) {
    criticalFlags.push("user_prompt_truncated_or_missing");
  }

  if (!norm(engine.systemInstructions)) {
    criticalFlags.push("engine_system_instructions_missing");
  }

  if (!norm(engine.outputRequirements) && norm(legacy.outputRequirements)) {
    criticalFlags.push("output_requirements_missing_in_engine");
  }

  if (legacy.model && engine.model && legacy.model !== engine.model) {
    criticalFlags.push("model_mismatch");
  }

  if (
    legacy.estimatedCredits != null &&
    engine.estimatedCredits != null &&
    legacy.estimatedCredits !== engine.estimatedCredits
  ) {
    criticalFlags.push("pricing_mismatch");
  }

  if (legacy.attachmentsMeta?.length && !engine.attachmentsMeta?.length) {
    criticalFlags.push("attachments_missing_in_engine");
  }

  for (const s of sections) {
    if (s.classification === "missing_in_engine" && s.critical) {
      criticalFlags.push(`${s.key}_missing_in_engine`);
    }
    if (s.classification === "conflict") {
      warnings.push(`${s.label}: role/content conflict`);
    } else if (s.classification === "expected_structural_difference") {
      warnings.push(`${s.label}: expected structural difference`);
    } else if (s.classification === "warning" || s.classification === "engine_only") {
      warnings.push(`${s.label}: ${s.classification}`);
    }
  }

  const uniqueCritical = [...new Set(criticalFlags)];

  return {
    sections,
    warnings: [...warnings, ...uniqueCritical.map((c) => `critical: ${c}`)],
    criticalFlags: uniqueCritical,
    hasCriticalMismatch: uniqueCritical.length > 0,
  };
}

export function buildStructuralDiff(
  legacy: ShadowComparisonSnapshot,
  engine: ShadowComparisonSnapshot
): ShadowStructuralDiff {
  const web = buildWebStructuralDiff(legacy, engine);
  return { sections: web.sections, warnings: web.warnings };
}
