/**
 * Legacy production prompt assembly — used for parity tests only.
 * Mirrors current generate/image routes without provider calls.
 */

import {
  composeToolPrompt,
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
  attachments?: Array<{ type: string }>;
  useBrain?: boolean;
  brainProfile?: WorkspaceBrainProfile | null;
  sources?: WorkspaceSource[];
  /** Web-only generate body fields */
  webBody?: Partial<AiGenerateRequest>;
  presetPrompt?: string;
}

export interface LegacyComposeResult {
  prompt: string;
  system?: string;
  user?: string;
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
      primaryColor: input.webBody?.primaryColor ?? "#253FDA",
      ...input.webBody,
    } as AiGenerateRequest;

    const system = buildHtmlGenerateSystem(body, masterPlusOptions);
    let user = buildHtmlGenerateUser(body);
    if (fortBriefBlock) user = `${user}\n\n## BRIEF EKSPERT (maroFort)\n${fortBriefBlock}`;
    return { prompt: `${system}\n\n---\n\n${user}`, system, user };
  }

  let finalPrompt = composeToolPrompt(tool, input.selections, input.toolPrompts, input.userPrompt);
  if (input.presetPrompt?.trim()) {
    finalPrompt = `${input.presetPrompt.trim()}\n\n${finalPrompt}`;
  }

  const hasRefs = (input.attachments ?? []).some((a) => a.type.startsWith("image"));
  if (hasRefs) {
    finalPrompt = `${finalPrompt}\n\nIMPORTANT: Use the provided reference image(s) as the main subject/product. Keep the product's real shape, colors, label and proportions faithful; integrate it naturally and prominently into the composition.`;
  }

  const textSetting = tool.settings.find((s) => s.id === "text");
  if (textSetting) {
    const textOn = (input.selections.text ?? textSetting.default) === "on";
    if (textOn) {
      const fontSetting = tool.settings.find((s) => s.id === "font");
      const fontOpt = fontSetting
        ? findOption(fontSetting, input.selections.font ?? fontSetting.default)
        : undefined;
      const fontNote = fontOpt ? ` Use a ${fontOpt.label} typography style.` : "";
      finalPrompt = `${finalPrompt}\n\nText: render any requested headline/text cleanly and legibly, spelling every word correctly.${fontNote}`;
    } else {
      finalPrompt = `${finalPrompt}\n\nDo not include any text, letters, words, numbers or watermarks in the image.`;
    }
  }

  const fortModule = toolToFortModule(registryId);
  if (input.fort?.enabled && fortModule) {
    const brief = buildFortBrief({
      module: fortModule,
      config: input.fortConfig,
      values: (input.fort.values ?? {}) as FortValues,
    });
    const compiled = compileBrief(brief.briefText);
    const layerText = brief.appliedLayers.map((l) => l.content.trim()).filter(Boolean).join("\n\n");
    const parts: string[] = [];
    if (layerText) parts.push(layerText);
    parts.push(finalPrompt);
    if (compiled.text.trim()) parts.push(`## BRIEF EKSPERT (maroFort)\n${compiled.text}`);
    finalPrompt = parts.join("\n\n");
  }

  if (input.useBrain && input.brainProfile && registryId === "reklama") {
    finalPrompt = `${finalPrompt}\n\n${buildBrainBrief(input.brainProfile)}`;
    const matched = matchSourcesByPrompt(input.userPrompt, input.sources ?? []);
    if (matched.length) finalPrompt = `${finalPrompt}\n\n${buildMatchedSourcesBrief(matched)}`;
  }

  return { prompt: finalPrompt };
}
