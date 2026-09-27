import type { CompiledGenerationBrief } from "../types";
import type { CompileGenerationBriefInput, EngineCompileContext } from "../types";
import {
  buildEngineImageProviderRequest,
  type NormalizedOpenAIImageRequest,
} from "../imageCompile";
import type { EngineAdapterResult, OpenAIImageAdapterRequest } from "./types";
import type { ImageQuality, ImageSize } from "@/lib/tools/registry";

export interface MapImageBriefOptions {
  size?: ImageSize;
  quality?: ImageQuality;
  n?: number;
  brainLogoUrl?: string;
  matchedSourceUrls?: string[];
  fetchedUrls?: Set<string>;
  brainBriefOverride?: string;
  matchedSourcesBrief?: string;
  workspaceBrandBrief?: string;
  compileInput?: CompileGenerationBriefInput;
  compileContext?: Pick<EngineCompileContext, "toolPrompts">;
}

/** Map Engine image/logo brief to OpenAI image request shape (no provider call). */
export function mapImageBriefToOpenAI(
  brief: CompiledGenerationBrief,
  opts?: MapImageBriefOptions
): EngineAdapterResult<OpenAIImageAdapterRequest> {
  const input = opts?.compileInput;
  const ctx = opts?.compileContext;

  if (!input || !ctx) {
    const prompt =
      brief.providerMessages?.debugFlatPreview?.trim() ||
      [brief.providerMessages?.systemInstructions, brief.providerMessages?.userContent]
        .filter(Boolean)
        .join("\n\n")
        .trim() ||
      brief.primaryUserRequest?.trim();

    if (!prompt) return { ok: false, error: "missing_image_prompt" };

    return {
      ok: true,
      request: {
        operation: "generate",
        prompt,
        model: brief.model,
        size: opts?.size,
        quality: opts?.quality,
        n: opts?.n ?? 1,
        references: [],
        referenceCountReceived: 0,
        referenceCountUsable: 0,
        referenceCountUsed: 0,
        referenceLimit: 4,
        referencesRequested: false,
        fallbackFromEditToGenerate: false,
      },
    };
  }

  const normalized = buildEngineImageProviderRequest(brief, input, ctx, opts);
  return { ok: true, request: normalizedToAdapterRequest(normalized) };
}

export function normalizedToAdapterRequest(
  normalized: NormalizedOpenAIImageRequest
): OpenAIImageAdapterRequest {
  return {
    operation: normalized.operation,
    prompt: normalized.prompt,
    model: normalized.model,
    size: normalized.size,
    quality: normalized.quality,
    n: normalized.n,
    references: normalized.references,
    referenceCountReceived: normalized.referenceCountReceived,
    referenceCountUsable: normalized.referenceCountUsable,
    referenceCountUsed: normalized.referenceCountUsed,
    referenceLimit: normalized.referenceLimit,
    referencesRequested: normalized.referencesRequested,
    fallbackFromEditToGenerate: normalized.fallbackFromEditToGenerate,
  };
}

export function buildNormalizedFromBrief(
  brief: CompiledGenerationBrief,
  input: CompileGenerationBriefInput,
  ctx: Pick<EngineCompileContext, "toolPrompts">,
  opts?: MapImageBriefOptions
): NormalizedOpenAIImageRequest {
  return buildEngineImageProviderRequest(brief, input, ctx, opts);
}
