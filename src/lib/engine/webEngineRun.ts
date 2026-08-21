import "server-only";

import { callClaudeText } from "@/lib/ai/anthropic";
import { parseHtmlPages } from "@/lib/ai/htmlParse";
import type { AiGenerateRequest, AiHtmlPage } from "@/lib/ai/types";
import { compileGenerationBrief } from "./compiler";
import { mapEngineBriefToProviderRequest } from "./adapters/mapBrief";
import { loadCompileContext } from "./storage";
import type { CompiledGenerationBrief } from "./types";
import type { WebEngineFailureStage } from "./executionTelemetry";

export type WebEngineProviderCall = (input: {
  system: string;
  user: string;
  imageUrls?: string[];
  effort?: string;
  model: string;
}) => Promise<{ text: string }>;

export type WebEngineRunResult =
  | {
      ok: true;
      pages: AiHtmlPage[];
      text: string;
      brief: CompiledGenerationBrief;
      finalPrompt: string;
      providerRequestCount: 1;
      providerLatencyMs: number;
      totalLatencyMs: number;
    }
  | {
      ok: false;
      stage: WebEngineFailureStage;
      error: string;
      code?: string;
      providerRequestCount: number;
      brief?: CompiledGenerationBrief;
    };

export async function runWebEngineInternalGeneration(input: {
  body: AiGenerateRequest;
  userId: string;
  workspaceId?: string | null;
  selections?: Record<string, string>;
  fort?: { enabled: boolean; values: Record<string, unknown> };
  claudeModel: string;
  effort?: string;
  provider?: WebEngineProviderCall;
}): Promise<WebEngineRunResult> {
  const started = Date.now();
  let providerRequestCount = 0;

  let brief: CompiledGenerationBrief;
  try {
    const ctx = await loadCompileContext("maro_web", {
      ownerUserId: input.userId,
      workspaceId: input.workspaceId ?? undefined,
    });
    brief = compileGenerationBrief(
      {
        toolId: "maro_web",
        userId: input.userId,
        workspaceId: input.workspaceId ?? undefined,
        model: input.claudeModel,
        userPrompt: input.body.userPrompt || input.body.goal || "",
        selections: input.selections,
        fort: input.fort,
        useBrain: false,
        attachments: input.body.referenceImages?.map((url, index) => ({
          type: "image/reference",
          name: `reference-${index + 1}`,
          url,
        })),
        webRequest: input.body,
      },
      ctx
    );
  } catch (e) {
    return {
      ok: false,
      stage: "compile",
      error: (e as Error)?.message ?? "compile_failed",
      code: "engine_compile_failed",
      providerRequestCount,
    };
  }

  const mapped = mapEngineBriefToProviderRequest(brief, { effort: input.effort });
  if (!mapped?.claude) {
    return {
      ok: false,
      stage: "map",
      error: "engine_map_failed",
      code: "engine_map_failed",
      providerRequestCount,
      brief,
    };
  }

  const provider = input.provider ?? callClaudeText;
  const providerStarted = Date.now();
  let text: string;
  try {
    providerRequestCount = 1;
    const result = await provider({
      system: mapped.claude.system,
      user: mapped.claude.user,
      imageUrls: mapped.claude.imageUrls,
      effort: mapped.claude.effort ?? input.effort,
      model: mapped.claude.model ?? input.claudeModel,
    });
    text = result.text;
  } catch (e) {
    const err = e as { code?: string; message?: string };
    return {
      ok: false,
      stage: "provider",
      error: err.message ?? "provider_failed",
      code: err.code ?? "provider_failed",
      providerRequestCount,
      brief,
    };
  }

  const providerLatencyMs = Date.now() - providerStarted;
  const pages = parseHtmlPages(text);
  if (!pages.length) {
    return {
      ok: false,
      stage: "parse",
      error: "empty",
      code: "empty_html",
      providerRequestCount,
      brief,
    };
  }

  const finalPrompt =
    brief.renderedProviderPrompt ??
    `${mapped.claude.system}\n\n---\n\n${mapped.claude.user}`;

  return {
    ok: true,
    pages,
    text,
    brief,
    finalPrompt,
    providerRequestCount: 1 as const,
    providerLatencyMs,
    totalLatencyMs: Date.now() - started,
  };
}
