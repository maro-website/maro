/**
 * Central Maro Engine compiler — Phase 2A.
 * Does NOT call AI providers. Used by admin dry run + future Phase 2B migration.
 */

import { buildFortBrief } from "@/lib/fort/briefBuilder";
import { compileBrief } from "@/lib/fort/compile";
import type { FortValues } from "@/lib/fort/types";
import {
  composeToolPrompt,
  defaultSelections,
  findOption,
  getTool,
  optionKey,
  visibleSettings,
  type ToolSelections,
} from "@/lib/tools/registry";
import { buildConditionContext, matchesEngineConditions } from "./conditions";
import { buildToolBrainContext, resolveBrainMapping } from "./brainMapping";
import { detectBriefConflicts } from "./conflicts";
import { validateModelForTool } from "./models";
import { estimateGenerationCredits } from "./pricing";
import { buildWebSystemRoleAppendix, buildWebOutputRequirements, buildWebUserContent } from "./webCompile";
import { buildProviderMessages, type BuildProviderMessagesOptions } from "./providerMessages";
import { summarizeCompileWarnings } from "./warnings";
import { engineIdToFortModule, getEngineToolDefinition, resolveEngineToolId } from "./toolRegistry";
import type {
  AppliedPromptLayer,
  CompileGenerationBriefInput,
  CompiledGenerationBrief,
  EngineCompileContext,
  EngineToolId,
  PromptLayerRecord,
} from "./types";

export function selectPromptLayers(
  layers: PromptLayerRecord[],
  ctx: ReturnType<typeof buildConditionContext>
): AppliedPromptLayer[] {
  return layers
    .filter((l) => l.enabled && l.status === "live")
    .filter((l) => matchesEngineConditions(l.conditions, ctx))
    .filter((l) => l.instructions.trim().length > 0)
    .sort((a, b) => b.priority - a.priority || a.layerKey.localeCompare(b.layerKey))
    .map((l) => ({
      layerKey: l.layerKey,
      name: l.name,
      priority: l.priority,
      instructions: l.instructions.trim(),
    }));
}

function resolveSelections(toolId: EngineToolId, selections?: ToolSelections): ToolSelections {
  const registryId = getEngineToolDefinition(toolId).registryToolId;
  const tool = getTool(registryId);
  if (!tool) return selections ?? {};
  return { ...defaultSelections(tool), ...selections };
}

function buildOptionFragments(
  toolId: EngineToolId,
  selections: ToolSelections,
  toolPrompts: Record<string, string>
): string {
  const registryId = getEngineToolDefinition(toolId).registryToolId;
  const tool = getTool(registryId);
  if (!tool) return "";
  const parts: string[] = [];
  for (const s of visibleSettings(tool, selections)) {
    const optId = selections[s.id] ?? s.default;
    const frag = toolPrompts[optionKey(registryId, s.id, optId)];
    if (frag?.trim()) parts.push(frag.trim());
  }
  return parts.join("\n\n");
}

function buildTechnicalDirection(
  toolId: EngineToolId,
  selections: ToolSelections,
  attachments: CompileGenerationBriefInput["attachments"]
): string | undefined {
  const registryId = getEngineToolDefinition(toolId).registryToolId;
  const tool = getTool(registryId);
  if (!tool) return undefined;

  const lines: string[] = [];
  if ((attachments ?? []).length > 0) {
    lines.push(
      "Use provided reference attachment(s) faithfully. Preserve product shape, colors, label and proportions."
    );
  }

  const textSetting = tool.settings.find((s) => s.id === "text");
  if (textSetting) {
    const textOn = (selections.text ?? textSetting.default) === "on";
    if (textOn) {
      const fontSetting = tool.settings.find((s) => s.id === "font");
      const fontOpt = fontSetting
        ? findOption(fontSetting, selections.font ?? fontSetting.default)
        : undefined;
      lines.push(
        fontOpt
          ? `Render requested text cleanly with ${fontOpt.label} typography.`
          : "Render requested text cleanly and legibly."
      );
    } else {
      lines.push("Do not include text, letters, words, numbers or watermarks.");
    }
  }

  for (const s of visibleSettings(tool, selections)) {
    const opt = findOption(s, selections[s.id] ?? s.default);
    if (opt?.size) lines.push(`Output size: ${opt.size}`);
  }

  return lines.length ? lines.join("\n") : undefined;
}

function resolveSystemPromptContent(ctx: EngineCompileContext): string {
  const registryId = ctx.tool.registryToolId;
  const fromVersion = ctx.systemPrompt?.content?.trim();
  if (fromVersion) return fromVersion;

  const fromToolPrompts = ctx.toolPrompts[`${registryId}.base`]?.trim();
  if (ctx.tool.toolId === "maro_web") {
    return fromToolPrompts || ctx.masterPrompt?.trim() || getTool(registryId)?.defaultPrompt?.trim() || "";
  }
  return fromToolPrompts || getTool(registryId)?.defaultPrompt?.trim() || "";
}

export function compileGenerationBrief(
  input: CompileGenerationBriefInput,
  ctx: EngineCompileContext
): CompiledGenerationBrief {
  const engineId = resolveEngineToolId(input.toolId);
  if (!engineId) throw new Error(`Unknown tool: ${input.toolId}`);

  const modelResult = validateModelForTool(engineId, input.model, ctx.models);
  const model = modelResult.modelId;
  const selections = resolveSelections(engineId, input.selections);
  const conditionCtx = buildConditionContext({ ...input, toolId: engineId, selections }, model);
  const appliedLayers = selectPromptLayers(ctx.layers, conditionCtx);

  const optionFragments = buildOptionFragments(engineId, selections, ctx.toolPrompts);
  const brainMapping = resolveBrainMapping(engineId, ctx.tool.brainMapping);
  const useBrain = input.useBrain !== false && brainMapping.usesBrain;
  const brain = useBrain
    ? buildToolBrainContext({
        toolId: engineId,
        mapping: brainMapping,
        profile: ctx.brainProfile ?? null,
        userPrompt: input.userPrompt,
        sources: ctx.brainSources ?? [],
      })
    : { text: "", sectionsUsed: [] as string[] };

  let fortBlock: Record<string, unknown> | undefined;
  let fortBriefText = "";
  let fortLayerText = "";
  const fortModule = engineIdToFortModule(engineId);
  if (input.fort?.enabled && fortModule && ctx.tool.usesFort) {
    const brief = buildFortBrief({
      module: fortModule,
      config: ctx.fortConfig as never,
      values: (input.fort.values ?? {}) as FortValues,
    });
    fortBriefText = compileBrief(brief.briefText).text.trim();
    fortLayerText = brief.appliedLayers
      .map((l) => l.content.trim())
      .filter(Boolean)
      .join("\n\n");
    fortBlock = {
      enabled: true,
      values: input.fort.values ?? {},
      appliedLayerIds: brief.appliedLayerIds,
      score: brief.score,
    };
  }

  const presetPrompt = input.presetPrompt ?? ctx.presetPrompt ?? undefined;
  const conflicts = detectBriefConflicts({
    userPrompt: input.userPrompt,
    fortValues: input.fort?.values ?? {},
    presetPrompt,
    brainContext: brain.text,
  });

  const warnings = summarizeCompileWarnings(ctx);
  const creativeParts =
    engineId === "maro_web"
      ? [optionFragments, presetPrompt, fortLayerText].filter(Boolean)
      : [optionFragments, presetPrompt].filter(Boolean);
  const technicalDirection = buildTechnicalDirection(engineId, selections, input.attachments);

  let systemContent = resolveSystemPromptContent(ctx);
  if (engineId === "maro_web" && !systemContent.includes("elite web designer")) {
    systemContent = systemContent
      ? `${systemContent.trim()}\n\n${buildWebSystemRoleAppendix()}`
      : buildWebSystemRoleAppendix();
  }

  const webUserContent =
    engineId === "maro_web" && input.webRequest
      ? buildWebUserContent(input, input.fort?.enabled ? fortBriefText : undefined)
      : undefined;

  const providerOpts: BuildProviderMessagesOptions | undefined =
    engineId === "maro_web" && webUserContent
      ? { userContentOverride: webUserContent, omitFortFromSystem: true }
      : undefined;

  const brief: CompiledGenerationBrief = {
    tool: engineId,
    registryToolId: ctx.tool.registryToolId,
    model,
    systemPromptVersion: ctx.systemPrompt
      ? {
          id: ctx.systemPrompt.id,
          versionLabel: ctx.systemPrompt.versionLabel,
          status: ctx.systemPrompt.status,
        }
      : { versionLabel: "legacy-fallback", status: "fallback" },
    primaryUserRequest: input.userPrompt.trim() || undefined,
    brandContext: brain.text || undefined,
    creativeDirection: creativeParts.length ? creativeParts.join("\n\n") : undefined,
    technicalDirection,
    fort: fortBlock,
    preset: input.presetId ? { id: input.presetId } : undefined,
    appliedLayers,
    restrictions: engineId === "maro_web" ? undefined : fortBriefText || undefined,
    outputRequirements:
      engineId === "maro_web"
        ? buildWebOutputRequirements(input)
        : getTool(ctx.tool.registryToolId)?.kind === "website"
          ? "Produce structured HTML output per maro Web spec."
          : undefined,
    metadata: {
      productionPipeline: ctx.tool.productionPipeline,
      promptCompilerV2: ctx.promptCompilerV2,
      brainUsed: Boolean(brain.text),
      brainSections: brain.sectionsUsed,
      conflicts,
      warnings,
      selections,
      ...(engineId === "maro_web"
        ? { websiteType: input.webRequest?.websiteType ?? selections.type }
        : {}),
    },
    estimatedCredits: estimateGenerationCredits(engineId, selections, ctx.pricingOverrides),
  };

  if (fortBriefText && engineId !== "maro_web") {
    brief.restrictions = fortBriefText;
  }

  brief.providerMessages = buildProviderMessages(brief, systemContent, input, providerOpts);
  brief.renderedProviderPrompt = brief.providerMessages.debugFlatPreview;
  return brief;
}
