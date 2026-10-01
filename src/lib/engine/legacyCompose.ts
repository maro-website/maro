/**
 * Legacy production prompt assembly — used for parity tests only.
 * Mirrors current generate/image routes without provider calls.
 */

import {
  defaultSelections,
  findOption,
  getTool,
  visibleSettings,
  type ToolSelections,
} from "@/lib/tools/registry";
import { buildFortBrief } from "@/lib/fort/briefBuilder";
import { compileBrief } from "@/lib/fort/compile";
import { toolToFortModule } from "@/lib/fort/types";
import type { FortConfig, FortValues } from "@/lib/fort/types";
import {
  buildBrainBrief,
  buildMatchedSourcesBrief,
  matchSourcesByPrompt,
} from "@/lib/workspaces/brainProfile";
import type { WorkspaceBrainProfile, WorkspaceSource } from "@/lib/workspaces/brainTypes";
import { buildHtmlGenerateSystem, buildHtmlGenerateUser } from "@/lib/ai/prompts";
import type { AiGenerateRequest } from "@/lib/ai/types";
import { assembleImageFlatPrompt } from "./imageCompile";
import type { EngineToolId } from "./types";
import { getRegistryToolId } from "./toolRegistry";

export interface LegacyComposeInput {
  toolId: EngineToolId;
  userPrompt: string;
  selections: ToolSelections;
  toolPrompts: Record<string, string>;
  masterPrompt?: string;
  fortConfig?: FortConfig;
  fort?: { enabled: boolean; values: Record<string, unknown> };
  attachments?: Array<{ type: string; url?: string }>;
  useBrain?: boolean;
  brainProfile?: WorkspaceBrainProfile | null;
  sources?: WorkspaceSource[];
  /** Web-only generate body fields */
  webBody?: Partial<AiGenerateRequest>;
  presetPrompt?: string;
  workspaceBrandBrief?: string;
}

export interface LegacyComposeResult {
  prompt: string;
  system?: string;
  user?: string;
  fortLayerText?: string;
  fortExpertBrief?: string;
}

export function legacyComposePrompt(input: LegacyComposeInput): LegacyComposeResult {
  const registryId = getRegistryToolId(input.toolId);
  const tool = getTool(registryId);
  if (!tool) return { prompt: input.userPrompt };

  if (tool.kind === "website") {
    let extraPrompt = "";
    for (const s of visibleSettings(tool, input.selections)) {
      const optId = input.selections[s.id] ?? s.default;
      const frag = input.toolPrompts[`website.${s.id}.${optId}`];
      if (frag?.trim()) extraPrompt = extraPrompt ? `${extraPrompt}\n\n${frag.trim()}` : frag.trim();
    }
    if (input.presetPrompt?.trim()) {
      extraPrompt = extraPrompt
        ? `${input.presetPrompt.trim()}\n\n${extraPrompt}`
        : input.presetPrompt.trim();
    }

    let fortLayerText = "";
    let fortBriefBlock = "";
    if (input.fort?.enabled) {
      const brief = buildFortBrief({
        module: "web",
        config: input.fortConfig,
        values: (input.fort.values ?? {}) as FortValues,
      });
      fortLayerText = brief.appliedLayers.map((l) => l.content.trim()).filter(Boolean).join("\n\n");
      fortBriefBlock = compileBrief(brief.briefText).text.trim();
    }

    const masterPlusOptions = [input.masterPrompt ?? "", extraPrompt, fortLayerText]
      .filter(Boolean)
      .join("\n\n");

    const body = {
      businessName: input.webBody?.businessName ?? "Test Business",
      category: input.webBody?.category ?? "generic",
      language: input.webBody?.language ?? "auto",
      goal: input.webBody?.goal ?? input.userPrompt,
      userPrompt: input.userPrompt,
      websiteType: input.webBody?.websiteType ?? "business",
      speed: input.webBody?.speed ?? "fast",
      ...input.webBody,
    } as AiGenerateRequest;

    const system = buildHtmlGenerateSystem(body, masterPlusOptions);
    let user = buildHtmlGenerateUser(body);
    if (fortBriefBlock) user = `${user}\n\n## BRIEF EKSPERT (maroFort)\n${fortBriefBlock}`;
    return { prompt: `${system}\n\n---\n\n${user}`, system, user };
  }

  let finalPrompt = assembleImageFlatPrompt({
    toolId: input.toolId,
    userPrompt: input.userPrompt,
    selections: input.selections,
    toolPrompts: input.toolPrompts ?? {},
    presetPrompt: input.presetPrompt,
    attachments: input.attachments,
    fortLayerText: undefined,
    fortExpertBrief: undefined,
    brainBrief: undefined,
  });

  const fortModule = toolToFortModule(registryId);
  let fortLayerText: string | undefined;
  let fortExpertBrief: string | undefined;
  if (input.fort?.enabled && fortModule) {
    const brief = buildFortBrief({
      module: fortModule,
      config: input.fortConfig,
      values: (input.fort.values ?? {}) as FortValues,
    });
    fortExpertBrief = compileBrief(brief.briefText).text.trim();
    fortLayerText = brief.appliedLayers.map((l) => l.content.trim()).filter(Boolean).join("\n\n");
    finalPrompt = assembleImageFlatPrompt({
      toolId: input.toolId,
      userPrompt: input.userPrompt,
      selections: input.selections,
      toolPrompts: input.toolPrompts ?? {},
      presetPrompt: input.presetPrompt,
      attachments: input.attachments,
      fortLayerText,
      fortExpertBrief,
    });
  }

  let brainBrief: string | undefined;
  let matchedSourcesBrief: string | undefined;
  let brainLogoUrl: string | undefined;
  let matchedSourceUrls: string[] | undefined;
  if (input.useBrain && input.brainProfile && registryId === "reklama") {
    brainBrief = buildBrainBrief(input.brainProfile);
    const matched = matchSourcesByPrompt(input.userPrompt, input.sources ?? []);
    if (matched.length) {
      matchedSourcesBrief = buildMatchedSourcesBrief(matched);
      matchedSourceUrls = matched.map((s) => s.fileUrl).filter(Boolean);
    }
    brainLogoUrl = input.brainProfile.brand.logoUrl ?? undefined;
    finalPrompt = assembleImageFlatPrompt({
      toolId: input.toolId,
      userPrompt: input.userPrompt,
      selections: input.selections,
      toolPrompts: input.toolPrompts ?? {},
      presetPrompt: input.presetPrompt,
      attachments: input.attachments,
      fortLayerText,
      fortExpertBrief,
      brainBrief,
      matchedSourcesBrief,
      brainLogoUrl,
      matchedSourceUrls,
    });
  } else if (input.useBrain && input.workspaceBrandBrief?.trim() && registryId === "reklama") {
    finalPrompt = assembleImageFlatPrompt({
      toolId: input.toolId,
      userPrompt: input.userPrompt,
      selections: input.selections,
      toolPrompts: input.toolPrompts ?? {},
      presetPrompt: input.presetPrompt,
      attachments: input.attachments,
      fortLayerText,
      fortExpertBrief,
      workspaceBrandBrief: input.workspaceBrandBrief,
      brainLogoUrl: input.brainProfile?.brand.logoUrl ?? undefined,
    });
  }

  return { prompt: finalPrompt, fortLayerText, fortExpertBrief };
}
