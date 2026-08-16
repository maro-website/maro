/**
 * Legacy parity fixtures — representative production scenarios for semantic comparison.
 */

import type { LegacyComposeInput } from "./legacyCompose";
import { defaultModelsFromRegistry } from "./models";
import type { CompileGenerationBriefInput, EngineCompileContext, EngineToolId } from "./types";
import { getEngineToolDefinition, toRegisteredEngineTool } from "./toolRegistry";

export interface ParityFixture {
  id: string;
  toolId: EngineToolId;
  description: string;
  legacy: LegacyComposeInput;
  engine: CompileGenerationBriefInput;
  /** Minimal engine context when DB unavailable in unit tests */
  context?: Partial<EngineCompileContext>;
}

const DEFAULT_TOOL_PROMPTS: Record<string, string> = {
  "reklama.base":
    "You are maro Imazh, an expert visual art director. Produce a scroll-stopping, high-quality image with a clear focal point, strong contrast and deliberate empty space for a short headline. Modern, premium and on-brand. Avoid clutter, watermarks and fake logos or unreadable text.",
  "logo.base":
    "You are maro Logo, an expert brand & logo designer. From the description, produce a single, clean, memorable logo concept.",
};

export function buildTestContext(toolId: EngineToolId): EngineCompileContext {
  const def = getEngineToolDefinition(toolId);
  const tool = toRegisteredEngineTool(def);
  const models = defaultModelsFromRegistry(toolId);
  return {
    tool,
    model: models.find((m) => m.isDefault)?.modelId ?? models[0]?.modelId ?? "",
    models,
    systemPrompt: {
      id: "test-live",
      toolId,
      versionLabel: "v1",
      status: "live",
      content: DEFAULT_TOOL_PROMPTS[`${tool.registryToolId}.base`] ?? "",
      changeNote: "fixture",
      createdAt: new Date().toISOString(),
    },
    layers: [],
    inputFields: [],
    toolPrompts: DEFAULT_TOOL_PROMPTS,
    masterPrompt: "You are maro web system prompt.",
    fortConfig: {},
    brainProfile: null,
    presetPrompt: null,
    pricingOverrides: {},
    promptCompilerV2: false,
  };
}

export const PARITY_FIXTURES: ParityFixture[] = [
  {
    id: "imazh-simple",
    toolId: "maro_imazh",
    description: "Simple maro Imazh generation",
    legacy: {
      toolId: "maro_imazh",
      userPrompt: "Premium coffee bag on marble surface",
      selections: { model: "gpt-image-2", format: "ig-post", text: "off", speed: "normal" },
      toolPrompts: DEFAULT_TOOL_PROMPTS,
    },
    engine: {
      toolId: "maro_imazh",
      userPrompt: "Premium coffee bag on marble surface",
      selections: { model: "gpt-image-2", format: "ig-post", text: "off", speed: "normal" },
    },
  },
  {
    id: "imazh-attachment",
    toolId: "maro_imazh",
    description: "Attachment reference generation",
    legacy: {
      toolId: "maro_imazh",
      userPrompt: "Place product in lifestyle scene",
      selections: { model: "gpt-image-2", format: "fb-post", text: "off", speed: "normal" },
      toolPrompts: DEFAULT_TOOL_PROMPTS,
      attachments: [{ type: "image/png" }],
    },
    engine: {
      toolId: "maro_imazh",
      userPrompt: "Place product in lifestyle scene",
      selections: { model: "gpt-image-2", format: "fb-post", text: "off", speed: "normal" },
      attachments: [{ type: "image/png" }],
    },
  },
  {
    id: "imazh-text-on",
    toolId: "maro_imazh",
    description: "Text enabled with font selection",
    legacy: {
      toolId: "maro_imazh",
      userPrompt: "Summer sale creative",
      selections: { model: "gpt-image-2", format: "ig-story", text: "on", font: "bold", speed: "normal" },
      toolPrompts: DEFAULT_TOOL_PROMPTS,
    },
    engine: {
      toolId: "maro_imazh",
      userPrompt: "Summer sale creative",
      selections: { model: "gpt-image-2", format: "ig-story", text: "on", font: "bold", speed: "normal" },
    },
  },
  {
    id: "logo-simple",
    toolId: "maro_logo",
    description: "Simple logo type both",
    legacy: {
      toolId: "maro_logo",
      userPrompt: "Minimal fintech logo for NovaPay",
      selections: { model: "gpt-image-2", type: "both", present: "color", speed: "normal" },
      toolPrompts: DEFAULT_TOOL_PROMPTS,
    },
    engine: {
      toolId: "maro_logo",
      userPrompt: "Minimal fintech logo for NovaPay",
      selections: { model: "gpt-image-2", type: "both", present: "color", speed: "normal" },
      useBrain: false,
    },
  },
  {
    id: "web-landing",
    toolId: "maro_web",
    description: "Landing page web generation",
    legacy: {
      toolId: "maro_web",
      userPrompt: "Modern dental clinic website",
      selections: { model: "opus-4-8", type: "landing", speed: "normal" },
      toolPrompts: DEFAULT_TOOL_PROMPTS,
      masterPrompt: "You are maro web system prompt.",
      webBody: {
        businessName: "Smile Dental",
        category: "dentist",
        language: "sq",
        websiteType: "business",
        speed: "fast",
      },
    },
    engine: {
      toolId: "maro_web",
      userPrompt: "Modern dental clinic website",
      selections: { model: "opus-4-8", type: "landing", speed: "normal" },
    },
  },
];
