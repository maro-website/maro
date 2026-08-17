/**
 * maroImazh-specific structural shadow diff with deterministic classifications.
 */

import type {
  NormalizedOpenAIImageRequest,
  SafeImageReferenceMeta,
} from "./imageCompile";
import type {
  ShadowComparisonSnapshot,
  ShadowStructuralDiff,
  StructuralDiffSection,
} from "./types";

export type ImageDiffClassification =
  | "match"
  | "expected_structural_difference"
  | "missing_in_engine"
  | "engine_only"
  | "conflict"
  | "warning";

export interface ImageDiffSection extends StructuralDiffSection {
  classification: ImageDiffClassification;
  critical?: boolean;
}

export interface ImageShadowStructuralDiff extends ShadowStructuralDiff {
  sections: ImageDiffSection[];
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
  opts?: { critical?: boolean }
): ImageDiffSection {
  const l = norm(legacy);
  const e = norm(engine);
  let status: StructuralDiffSection["status"] = "same";
  let classification: ImageDiffClassification = "match";

  if (!l && !e) {
    status = "same";
    classification = "match";
  } else if (l && !e) {
    status = "legacy_only";
    classification = "missing_in_engine";
  } else if (!l && e) {
    status = "engine_only";
    classification = "engine_only";
  } else if (l === e) {
    status = "same";
    classification = "match";
  } else {
    status = "different";
    classification = "warning";
  }

  return { key, label, legacy, engine, status, classification, critical: opts?.critical };
}

function providerOf(snapshot: ShadowComparisonSnapshot): NormalizedOpenAIImageRequest | undefined {
  return snapshot.imageProvider;
}

function refSummary(refs?: SafeImageReferenceMeta[]): string | undefined {
  if (!refs?.length) return undefined;
  return refs
    .map(
      (r) =>
        `${r.index}:${r.sourceType}:${r.usable ? "usable" : "unusable"}:${r.includedInProviderRequest ? "used" : "skipped"}`
    )
    .join("; ");
}

export function buildImageStructuralDiff(
  legacy: ShadowComparisonSnapshot,
  engine: ShadowComparisonSnapshot,
  context?: {
    fortEnabled?: boolean;
    brainUsed?: boolean;
    presetPresent?: boolean;
    compileError?: string;
  }
): ImageShadowStructuralDiff {
  const legacyP = providerOf(legacy);
  const engineP = providerOf(engine);

  const sections: ImageDiffSection[] = [
    classifySection("operation", "Operation (generate/edit)", legacyP?.operation, engineP?.operation, {
      critical: true,
    }),
    classifySection("model", "Model", legacy.model ?? legacyP?.model, engine.model ?? engineP?.model, {
      critical: true,
    }),
    classifySection("size", "Size", legacyP?.size, engineP?.size, { critical: true }),
    classifySection("quality", "Quality", legacyP?.quality, engineP?.quality, { critical: true }),
    classifySection(
      "n",
      "Generation count (n)",
      legacyP?.n != null ? String(legacyP.n) : undefined,
      engineP?.n != null ? String(engineP.n) : undefined,
      { critical: true }
    ),
    classifySection(
      "referenceCount",
      "Reference count used",
      legacyP?.referenceCountUsed != null ? String(legacyP.referenceCountUsed) : undefined,
      engineP?.referenceCountUsed != null ? String(engineP.referenceCountUsed) : undefined,
      { critical: true }
    ),
    classifySection(
      "references",
      "Reference metadata",
      refSummary(legacyP?.references),
      refSummary(engineP?.references)
    ),
    classifySection(
      "prompt",
      "Provider prompt",
      legacy.userContent ?? legacyP?.prompt,
      engine.userContent ?? engineP?.prompt
    ),
    classifySection(
      "fort",
      "maroFort",
      legacy.fortValues ? JSON.stringify(legacy.fortValues) : undefined,
      engine.fortValues ? JSON.stringify(engine.fortValues) : undefined
    ),
    classifySection(
      "brain",
      "maroBrain",
      legacy.brainSections?.join(", "),
      engine.brainSections?.join(", ")
    ),
    classifySection(
      "preset",
      "maroPrompt preset",
      legacy.metadata?.presetId as string | undefined,
      engine.metadata?.presetId as string | undefined
    ),
    classifySection("restrictions", "Restrictions", legacy.restrictions, engine.restrictions),
  ];

  const criticalFlags: string[] = [];
  const warnings: string[] = [];

  if (context?.compileError) {
    criticalFlags.push("engine_compile_failed");
  }

  if (legacyP?.operation && engineP?.operation && legacyP.operation !== engineP.operation) {
    criticalFlags.push("operation_mismatch");
  }

  if (legacyP?.model && engineP?.model && legacyP.model !== engineP.model) {
    criticalFlags.push("model_mismatch");
  }

  if (legacyP?.size && engineP?.size && legacyP.size !== engineP.size) {
    criticalFlags.push("size_mismatch");
  }

  if (legacyP?.quality !== engineP?.quality && (legacyP?.quality || engineP?.quality)) {
    criticalFlags.push("quality_mismatch");
  }

  if (legacyP?.n != null && engineP?.n != null && legacyP.n !== engineP.n) {
    criticalFlags.push("generation_count_mismatch");
  }

  if (
    legacyP?.referenceCountUsed != null &&
    engineP?.referenceCountUsed != null &&
    legacyP.referenceCountUsed !== engineP.referenceCountUsed
  ) {
    criticalFlags.push("reference_count_mismatch");
  }

  if (legacyP?.referenceCountReceived && !engineP?.referenceCountReceived) {
    criticalFlags.push("references_missing_in_engine");
  }

  const legacyPrompt = norm(legacy.userContent ?? legacyP?.prompt);
  const enginePrompt = norm(engine.userContent ?? engineP?.prompt);

  if (legacyPrompt.includes("Do not include any text") && !enginePrompt.includes("Do not include any text")) {
    criticalFlags.push("text_instruction_missing");
  }

  if (context?.fortEnabled && !engine.fortValues && !norm(engine.restrictions)) {
    criticalFlags.push("fort_missing");
  }

  if (context?.brainUsed && legacy.brainSections?.length && !engine.brainSections?.length) {
    criticalFlags.push("brain_missing");
  }

  if (context?.presetPresent && !engine.metadata?.presetId) {
    criticalFlags.push("preset_missing");
  }

  if (legacyP?.fallbackFromEditToGenerate && !engineP?.fallbackFromEditToGenerate) {
    criticalFlags.push("edit_fallback_not_visible");
  }

  for (const s of sections) {
    if (s.classification === "missing_in_engine" && s.critical) {
      criticalFlags.push(`${s.key}_missing_in_engine`);
    }
    if (s.classification === "warning" || s.classification === "engine_only") {
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
