/**
 * Production shadow hooks — never affects legacy provider path.
 */

import { buildImageLegacySnapshot, buildWebLegacySnapshot } from "./legacySnapshot";
import { shouldRunShadowCompilation } from "./engineIntegrationPolicy";
import { getToolProductionPipeline } from "./pipeline";
import { runShadowCompilation, type ShadowCompileInput } from "./shadowCompile";
import { scheduleShadowCompilationReliable } from "./shadowSchedule";
import { getShadowFeatureFlags } from "@/lib/features/flags";
import type { AiGenerateRequest } from "@/lib/ai/types";

export async function maybeScheduleImageShadow(input: {
  registryToolId: string;
  finalPrompt: string;
  model: string;
  userId?: string | null;
  workspaceId?: string | null;
  userPrompt: string;
  selections?: Record<string, string>;
  fort?: { enabled: boolean; values: Record<string, unknown> };
  attachments?: Array<{ type: string; name?: string }>;
  useBrain?: boolean;
  estimatedCredits?: number;
  generationId?: string | null;
  jobId?: string | null;
  providerRequestCount?: number;
}): Promise<void> {
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
      fortValues: input.fort?.enabled ? input.fort.values : undefined,
      estimatedCredits: input.estimatedCredits,
    });

    const shadowInput: ShadowCompileInput = {
      toolId: input.registryToolId,
      registryToolId: input.registryToolId,
      model: input.model,
      userId: input.userId ?? undefined,
      workspaceId: input.workspaceId ?? undefined,
      userPrompt: input.userPrompt,
      selections: input.selections,
      fort: input.fort,
      attachments: input.attachments,
      useBrain: input.useBrain,
      legacySnapshot,
      generationId: input.generationId ?? undefined,
      jobId: input.jobId ?? undefined,
      providerRequestCount: input.providerRequestCount ?? 1,
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
      useBrain: Boolean(input.workspaceId),
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
