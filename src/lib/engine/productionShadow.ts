/**
 * Production shadow hooks — never affects legacy provider path.
 */

import { buildImageLegacySnapshot, buildWebLegacySnapshot } from "./legacySnapshot";
import type { ImageShadowSchedulePayload } from "./imageShadowRuntime";
import { buildImageShadowContextMetadata } from "./imageShadowRuntime";
import { shouldRunShadowCompilation } from "./engineIntegrationPolicy";
import { getToolProductionPipeline } from "./pipeline";
import { runShadowCompilation, type ShadowCompileInput } from "./shadowCompile";
import { scheduleShadowCompilationReliable } from "./shadowSchedule";
import { getShadowFeatureFlags } from "@/lib/features/flags";
import type { AiGenerateRequest } from "@/lib/ai/types";

export async function maybeScheduleImageShadow(input: ImageShadowSchedulePayload): Promise<void> {
  try {
    const { pipeline, engineId } = await getToolProductionPipeline(input.registryToolId);
    const shadowFlags = await getShadowFeatureFlags();
    if (
      !engineId ||
      !shouldRunShadowCompilation({
        pipeline,
        toolId: engineId,
        phase: "build",
        shadowFeatureFlags: shadowFlags,
      })
    ) {
      return;
    }

    const legacySnapshot = buildImageLegacySnapshot({
      finalPrompt: input.finalPrompt,
      model: input.model,
      imageProvider: input.legacyImageProvider,
      fortValues: input.fort?.enabled ? input.fort.values : undefined,
      estimatedCredits: input.estimatedCredits,
      presetId: input.presetId,
      restrictions: input.fortExpertBrief,
      brainSections: input.brainBrief
        ? ["full"]
        : input.brandOnly
          ? ["workspace_brand"]
          : undefined,
    });

    const shadowInput: ShadowCompileInput = {
      toolId: input.registryToolId,
      registryToolId: input.registryToolId,
      model: input.model,
      userId: input.userId,
      workspaceId: input.workspaceId ?? undefined,
      userPrompt: input.userPrompt,
      selections: input.selections,
      fort: input.fort,
      attachments: input.attachments,
      useBrain: input.useBrain,
      brandOnly: input.brandOnly,
      presetId: input.presetId,
      presetPrompt: input.presetPrompt,
      quality: input.quality,
      n: input.n,
      explicitSize: input.size,
      workspaceBrandBrief: input.workspaceBrandBrief,
      brainBrief: input.brainBrief,
      matchedSourcesBrief: input.matchedSourcesBrief,
      brainLogoUrl: input.brainLogoUrl,
      matchedSourceUrls: input.matchedSourceUrls,
      fetchedUrls: input.fetchedUrls,
      toolPrompts: input.toolPrompts,
      fortLayerText: input.fortLayerText,
      fortExpertBrief: input.fortExpertBrief,
      textMode: input.textMode,
      font: input.font,
      legacySnapshot,
      imageContextMetadata: buildImageShadowContextMetadata({ payload: input }),
      generationId: input.generationId,
      jobId: input.jobId,
      providerRequestCount: 1,
    };

    await scheduleShadowCompilationReliable(runShadowCompilation, shadowInput);
  } catch (e) {
    console.error("[shadow/image] schedule failed:", e);
  }
}

export async function maybeScheduleWebShadow(input: {
  body: AiGenerateRequest;
  masterPlusOptions: string;
  fortBriefBlock?: string;
  legacySystem: string;
  legacyUser: string;
  model: string;
  userId?: string | null;
  workspaceId?: string | null;
  selections?: Record<string, string>;
  fort?: { enabled: boolean; values: Record<string, unknown> };
  estimatedCredits?: number;
  generationId?: string | null;
  jobId?: string | null;
  providerRequestCount?: number;
}): Promise<void> {
  try {
    const { pipeline, engineId } = await getToolProductionPipeline("website");
    if (!engineId || !shouldRunShadowCompilation({ pipeline, toolId: engineId, phase: "2b1" })) {
      return;
    }

    const legacySnapshot = buildWebLegacySnapshot({
      body: input.body,
      masterPlusOptions: input.masterPlusOptions,
      fortBriefBlock: input.fortBriefBlock,
      model: input.model,
      estimatedCredits: input.estimatedCredits,
      legacySystem: input.legacySystem,
      legacyUser: input.legacyUser,
      selections: input.selections,
      fortEnabled: input.fort?.enabled,
    });

    const shadowInput: ShadowCompileInput = {
      toolId: "website",
      registryToolId: "website",
      model: input.model,
      userId: input.userId ?? undefined,
      workspaceId: input.workspaceId ?? undefined,
      userPrompt: input.body.userPrompt || input.body.goal || "",
      selections: input.selections,
      fort: input.fort,
      useBrain: false,
      webRequest: input.body,
      legacySnapshot,
      generationId: input.generationId ?? undefined,
      jobId: input.jobId ?? undefined,
      websiteType: input.body.websiteType,
      speed: input.body.speed,
      providerRequestCount: input.providerRequestCount ?? 1,
    };

    await scheduleShadowCompilationReliable(runShadowCompilation, shadowInput);
  } catch (e) {
    console.error("[shadow/web] schedule failed:", e);
  }
}

export type { ImageShadowSchedulePayload };
