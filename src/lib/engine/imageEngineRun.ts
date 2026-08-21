import "server-only";

import { editImages, generateImages, type OpenAIImageError } from "@/lib/ai/openai";
import type { ImageQuality, ImageSize } from "@/lib/tools/registry";
import { compileGenerationBrief } from "./compiler";
import { mapEngineBriefToProviderRequest } from "./adapters/mapBrief";
import { IMAGE_PROVIDER_REF_LIMIT, IMAGE_TEXT_OFF_WITH_REFERENCE } from "./imageCompile";
import type { OpenAIImageAdapterRequest } from "./adapters/types";
import { loadCompileContext } from "./storage";
import type { CompileAttachmentMeta, CompiledGenerationBrief, CompileGenerationBriefInput, EngineToolId } from "./types";
import type { ImageEngineFailureStage } from "./executionTelemetry";

export type ImageEngineGenerateCall = (opts: {
  prompt: string;
  size?: ImageSize;
  quality?: ImageQuality;
  n?: number;
  abortSignal?: AbortSignal;
}) => Promise<string[]>;

export type ImageEngineEditCall = (opts: {
  prompt: string;
  images: string[];
  size?: ImageSize;
  quality?: ImageQuality;
  n?: number;
  abortSignal?: AbortSignal;
}) => Promise<string[]>;

export interface ImageEngineProviderCalls {
  generate: ImageEngineGenerateCall;
  edit: ImageEngineEditCall;
}

export type ImageEngineRunResult =
  | {
      ok: true;
      b64s: string[];
      brief: CompiledGenerationBrief;
      finalPrompt: string;
      providerRequest: OpenAIImageAdapterRequest;
      providerRequestCount: 1;
      providerLatencyMs: number;
      totalLatencyMs: number;
    }
  | {
      ok: false;
      stage: ImageEngineFailureStage;
      error: string;
      code?: string;
      providerRequestCount: number;
      brief?: CompiledGenerationBrief;
    };

function parseDataUrlMime(value: string): string | undefined {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.exec(value);
  return m?.[1];
}

/** Compile attachments keep only lightweight identifiers; bytes stay route-local. */
export function buildEngineCompileAttachments(attachments?: string[]): CompileAttachmentMeta[] {
  return (attachments ?? [])
    .filter((a): a is string => typeof a === "string")
    .map((a) => {
      if (a.startsWith("data:image/")) {
        const mime = parseDataUrlMime(a) ?? "image/png";
        return { type: mime, url: a };
      }
      if (a.startsWith("storage:generations/")) return { type: "image", url: a };
      if (a.startsWith("http")) return { type: "image", url: a };
      return { type: "unknown" };
    })
    .filter((a) => a.type !== "unknown");
}

export async function runImageEngineInternalGeneration(input: {
  engineToolId: EngineToolId;
  userId: string;
  workspaceId?: string | null;
  userPrompt: string;
  selections: Record<string, string>;
  model: string;
  fort?: { enabled: boolean; values: Record<string, unknown> };
  useBrain: boolean;
  presetId?: string;
  presetPrompt?: string;
  workspaceBrandBrief?: string;
  brainLogoUrl?: string;
  matchedSourceUrls?: string[];
  fetchedUrls: string[];
  attachments?: string[];
  /** Route-resolved in-memory data URLs for OpenAI edit — never logged or persisted. */
  resolvedRefBytes: string[];
  quality?: ImageQuality;
  n: number;
  size?: ImageSize;
  provider?: ImageEngineProviderCalls;
  abortSignal?: AbortSignal;
  /** Persist provider attempt telemetry immediately before the single OpenAI call. */
  onProviderAttemptStart?: (info: {
    operation: "generate" | "edit";
    providerRequestCount: 1;
  }) => void | Promise<void>;
}): Promise<ImageEngineRunResult> {
  const started = Date.now();
  let providerRequestCount = 0;
  const fetchedSet = new Set(input.fetchedUrls);
  const compileAttachments = buildEngineCompileAttachments(input.attachments);

  const compileInput: CompileGenerationBriefInput = {
    toolId: input.engineToolId,
    userId: input.userId,
    workspaceId: input.workspaceId ?? undefined,
    model: input.model,
    userPrompt: input.userPrompt,
    selections: input.selections,
    attachments: compileAttachments,
    fort: input.fort,
    useBrain: input.useBrain,
    presetId: input.presetId,
    presetPrompt: input.presetPrompt,
    workspaceBrandBrief: input.workspaceBrandBrief,
    explicitSize: input.size,
    quality: input.quality,
    n: input.n,
  };

  let brief: CompiledGenerationBrief;
  let ctx: Awaited<ReturnType<typeof loadCompileContext>>;
  try {
    ctx = await loadCompileContext(input.engineToolId, {
      ownerUserId: input.userId,
      workspaceId: input.workspaceId ?? undefined,
    });
    brief = compileGenerationBrief(compileInput, ctx);
  } catch (e) {
    return {
      ok: false,
      stage: "compile",
      error: (e as Error)?.message ?? "compile_failed",
      code: "engine_compile_failed",
      providerRequestCount,
    };
  }

  const mapped = mapEngineBriefToProviderRequest(brief, {
    imageSize: input.size,
    imageQuality: input.quality,
    imageN: input.n,
    compileInput,
    compileContext: ctx,
    brainLogoUrl: input.brainLogoUrl,
    matchedSourceUrls: input.matchedSourceUrls,
    fetchedUrls: fetchedSet,
    workspaceBrandBrief: input.workspaceBrandBrief,
  });

  if (!mapped?.openaiImage) {
    return {
      ok: false,
      stage: "map",
      error: "engine_map_failed",
      code: "engine_map_failed",
      providerRequestCount,
      brief,
    };
  }

  const req = mapped.openaiImage;
  const provider = input.provider ?? {
    generate: (opts) => generateImages(opts),
    edit: (opts) => editImages(opts),
  };
  const providerStarted = Date.now();
  let b64s: string[];

  try {
    if (req.operation === "edit") {
      const images = input.resolvedRefBytes.slice(0, IMAGE_PROVIDER_REF_LIMIT);
      if (!images.length) {
        if (req.fallbackFromEditToGenerate) {
          providerRequestCount = 1;
          await input.onProviderAttemptStart?.({ operation: "generate", providerRequestCount: 1 });
          b64s = await provider.generate({
            prompt: req.prompt,
            size: (req.size as ImageSize | undefined) ?? input.size,
            quality: input.quality,
            n: req.n ?? input.n,
            abortSignal: input.abortSignal,
          });
        } else {
          return {
            ok: false,
            stage: "provider",
            error: "edit_refs_missing",
            code: "edit_refs_missing",
            providerRequestCount: 0,
            brief,
          };
        }
      } else {
        providerRequestCount = 1;
        await input.onProviderAttemptStart?.({ operation: "edit", providerRequestCount: 1 });
        b64s = await provider.edit({
          prompt: req.prompt,
          images,
          size: (req.size as ImageSize | undefined) ?? input.size,
          quality: input.quality,
          n: req.n ?? input.n,
          abortSignal: input.abortSignal,
        });
      }
    } else {
      providerRequestCount = 1;
      await input.onProviderAttemptStart?.({ operation: "generate", providerRequestCount: 1 });
      b64s = await provider.generate({
        prompt: req.prompt,
        size: (req.size as ImageSize | undefined) ?? input.size,
        quality: input.quality,
        n: req.n ?? input.n,
        abortSignal: input.abortSignal,
      });
    }
  } catch (e) {
    const err = e as OpenAIImageError | Error;
    const code = "code" in err && typeof err.code === "string" ? err.code : "provider_failed";
    return {
      ok: false,
      stage: "provider",
      error: err.message ?? "provider_failed",
      code,
      providerRequestCount,
      brief,
    };
  }

  if (!b64s.length) {
    return {
      ok: false,
      stage: "provider",
      error: "empty",
      code: "empty",
      providerRequestCount,
      brief,
    };
  }

  const finalPrompt = brief.renderedProviderPrompt ?? req.prompt;

  return {
    ok: true,
    b64s,
    brief,
    finalPrompt,
    providerRequest: req,
    providerRequestCount: 1 as const,
    providerLatencyMs: Date.now() - providerStarted,
    totalLatencyMs: Date.now() - started,
  };
}

/** Test helper — assert reference-aware Text OFF in Engine provider prompt. */
export function enginePromptUsesReferenceAwareTextOff(prompt: string, hasReferences: boolean): boolean {
  if (hasReferences) {
    return prompt.includes(IMAGE_TEXT_OFF_WITH_REFERENCE);
  }
  return !prompt.includes(IMAGE_TEXT_OFF_WITH_REFERENCE);
}
