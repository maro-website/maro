/**
 * Legacy parity fixtures — representative production scenarios for semantic comparison.
 */

import type { LegacyComposeInput } from "./legacyCompose";
import { defaultModelsFromRegistry } from "./models";
import type { CompileGenerationBriefInput, EngineCompileContext, EngineToolId } from "./types";
import { getEngineToolDefinition, toRegisteredEngineTool } from "./toolRegistry";
import type { WorkspaceBrainProfile } from "@/lib/workspaces/brainTypes";
import { normalizeBrainProfile } from "@/lib/workspaces/brainProfile";

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
];

const DEFAULT_WEB_MASTER =
  "You are maro web system prompt. Craft premium Albanian business websites.";

export const SAMPLE_WEB_BRAIN_PROFILE: WorkspaceBrainProfile = normalizeBrainProfile({
  brand: {
    name: "FlowStack",
    category: "SaaS",
    description: "Workflow automation for Albanian SMBs",
    language: "en",
  },
  target: {
    audience: "Small business owners",
    painPoints: "Manual repetitive tasks",
  },
  goal: {
    primaryGoal: "Drive free trial signups",
  },
  content: {
    tone: "Professional and approachable",
    voice: "Clear, confident",
  },
} as Partial<WorkspaceBrainProfile>);

export function buildWebTestContext(overrides?: Partial<EngineCompileContext>): EngineCompileContext {
  const base = buildTestContext("maro_web");
  return {
    ...base,
    masterPrompt: DEFAULT_WEB_MASTER,
    systemPrompt: {
      ...base.systemPrompt!,
      content: DEFAULT_WEB_MASTER,
    },
    toolPrompts: {
      ...base.toolPrompts,
      "website.base": DEFAULT_WEB_MASTER,
    },
    ...overrides,
  };
}

export const WEB_PARITY_FIXTURES: ParityFixture[] = [
  {
    id: "web-simple",
    toolId: "maro_web",
    description: "Prompt-only website",
    legacy: {
      toolId: "maro_web",
      userPrompt: "Modern dental clinic website",
      selections: { model: "opus-4-8", type: "business", speed: "normal" },
      toolPrompts: { "website.base": DEFAULT_WEB_MASTER },
      masterPrompt: DEFAULT_WEB_MASTER,
      webBody: {
        businessName: "Smile Dental",
        category: "dentist",
        language: "sq",
        websiteType: "business",
        primaryColor: "#253FDA",
        userPrompt: "Modern dental clinic website",
      },
    },
    engine: {
      toolId: "maro_web",
      userPrompt: "Modern dental clinic website",
      selections: { model: "opus-4-8", type: "business", speed: "normal" },
      webRequest: {
        businessName: "Smile Dental",
        category: "dentist",
        language: "sq",
        websiteType: "business",
        primaryColor: "#253FDA",
        userPrompt: "Modern dental clinic website",
      },
    },
  },
  {
    id: "web-selections",
    toolId: "maro_web",
    description: "Website with option fragments",
    legacy: {
      toolId: "maro_web",
      userPrompt: "Landing for coffee roastery",
      selections: { model: "opus-4-8", type: "landing", speed: "fast" },
      toolPrompts: {
        "website.base": DEFAULT_WEB_MASTER,
        "website.type.landing": "Single-page landing focused on conversion.",
        "website.speed.fast": "Prioritize speed over exhaustive detail.",
      },
      masterPrompt: DEFAULT_WEB_MASTER,
      webBody: {
        businessName: "Kafe Alma",
        category: "restaurant",
        language: "sq",
        websiteType: "landing",
        primaryColor: "#8B4513",
        userPrompt: "Landing for coffee roastery",
      },
    },
    engine: {
      toolId: "maro_web",
      userPrompt: "Landing for coffee roastery",
      selections: { model: "opus-4-8", type: "landing", speed: "fast" },
      webRequest: {
        businessName: "Kafe Alma",
        category: "restaurant",
        language: "sq",
        websiteType: "landing",
        primaryColor: "#8B4513",
        userPrompt: "Landing for coffee roastery",
      },
    },
  },
  {
    id: "web-fort",
    toolId: "maro_web",
    description: "maroFort website",
    legacy: {
      toolId: "maro_web",
      userPrompt: "Premium law firm website",
      selections: { model: "opus-4-8", type: "business", speed: "normal" },
      toolPrompts: { "website.base": DEFAULT_WEB_MASTER },
      masterPrompt: DEFAULT_WEB_MASTER,
      fort: { enabled: true, values: { objective: "trust", tone: "formal" } },
      webBody: {
        businessName: "Lex & Partners",
        category: "agency",
        language: "sq",
        websiteType: "business",
        primaryColor: "#1a1a2e",
        userPrompt: "Premium law firm website",
      },
    },
    engine: {
      toolId: "maro_web",
      userPrompt: "Premium law firm website",
      selections: { model: "opus-4-8", type: "business", speed: "normal" },
      fort: { enabled: true, values: { objective: "trust", tone: "formal" } },
      webRequest: {
        businessName: "Lex & Partners",
        category: "agency",
        language: "sq",
        websiteType: "business",
        primaryColor: "#1a1a2e",
        userPrompt: "Premium law firm website",
      },
    },
  },
  {
    id: "web-brain",
    toolId: "maro_web",
    description: "maroBrain context (Engine-ready; legacy web path does not use brain today)",
    legacy: {
      toolId: "maro_web",
      userPrompt: "SaaS product website",
      selections: { model: "opus-4-8", type: "platform", speed: "normal" },
      toolPrompts: { "website.base": DEFAULT_WEB_MASTER },
      masterPrompt: DEFAULT_WEB_MASTER,
      webBody: {
        businessName: "FlowStack",
        category: "generic",
        language: "en",
        websiteType: "platform",
        primaryColor: "#253FDA",
        userPrompt: "SaaS product website",
      },
    },
    engine: {
      toolId: "maro_web",
      userPrompt: "SaaS product website",
      selections: { model: "opus-4-8", type: "platform", speed: "normal" },
      useBrain: true,
      webRequest: {
        businessName: "FlowStack",
        category: "generic",
        language: "en",
        websiteType: "platform",
        primaryColor: "#253FDA",
        userPrompt: "SaaS product website",
      },
    },
    context: { brainProfile: SAMPLE_WEB_BRAIN_PROFILE },
  },
  {
    id: "web-long-prompt",
    toolId: "maro_web",
    description: "Long custom user prompt preserved",
    legacy: {
      toolId: "maro_web",
      userPrompt:
        "Build a website for a boutique hotel in Saranda with emphasis on sea views, spa services, and direct booking CTA above the fold.",
      selections: { model: "opus-4-8", type: "business", speed: "normal" },
      toolPrompts: { "website.base": DEFAULT_WEB_MASTER },
      masterPrompt: DEFAULT_WEB_MASTER,
      webBody: {
        businessName: "Hotel Ionian",
        category: "generic",
        language: "sq",
        websiteType: "business",
        userPrompt:
          "Build a website for a boutique hotel in Saranda with emphasis on sea views, spa services, and direct booking CTA above the fold.",
      },
    },
    engine: {
      toolId: "maro_web",
      userPrompt:
        "Build a website for a boutique hotel in Saranda with emphasis on sea views, spa services, and direct booking CTA above the fold.",
      selections: { model: "opus-4-8", type: "business", speed: "normal" },
      webRequest: {
        businessName: "Hotel Ionian",
        category: "generic",
        language: "sq",
        websiteType: "business",
        userPrompt:
          "Build a website for a boutique hotel in Saranda with emphasis on sea views, spa services, and direct booking CTA above the fold.",
      },
    },
  },
  {
    id: "web-fort-brain",
    toolId: "maro_web",
    description: "maroFort + maroBrain together (Engine-ready)",
    legacy: {
      toolId: "maro_web",
      userPrompt: "Enterprise analytics dashboard website",
      selections: { model: "opus-4-8", type: "platform", speed: "normal" },
      toolPrompts: { "website.base": DEFAULT_WEB_MASTER },
      masterPrompt: DEFAULT_WEB_MASTER,
      fort: { enabled: true, values: { objective: "conversion", tone: "technical" } },
      webBody: {
        businessName: "DataPulse",
        category: "agency",
        language: "en",
        websiteType: "platform",
        primaryColor: "#253FDA",
        userPrompt: "Enterprise analytics dashboard website",
      },
    },
    engine: {
      toolId: "maro_web",
      userPrompt: "Enterprise analytics dashboard website",
      selections: { model: "opus-4-8", type: "platform", speed: "normal" },
      useBrain: true,
      fort: { enabled: true, values: { objective: "conversion", tone: "technical" } },
      webRequest: {
        businessName: "DataPulse",
        category: "agency",
        language: "en",
        websiteType: "platform",
        primaryColor: "#253FDA",
        userPrompt: "Enterprise analytics dashboard website",
      },
    },
    context: { brainProfile: SAMPLE_WEB_BRAIN_PROFILE },
  },
  {
    id: "web-model",
    toolId: "maro_web",
    description: "Explicit model selection preserved",
    legacy: {
      toolId: "maro_web",
      userPrompt: "Portfolio site for photographer",
      selections: { model: "sonnet-4-5", type: "landing", speed: "normal" },
      toolPrompts: { "website.base": DEFAULT_WEB_MASTER },
      masterPrompt: DEFAULT_WEB_MASTER,
      webBody: {
        businessName: "Lens Studio",
        category: "portfolio",
        language: "sq",
        websiteType: "landing",
        userPrompt: "Portfolio site for photographer",
      },
    },
    engine: {
      toolId: "maro_web",
      userPrompt: "Portfolio site for photographer",
      selections: { model: "sonnet-4-5", type: "landing", speed: "normal" },
      model: "sonnet-4-5",
      webRequest: {
        businessName: "Lens Studio",
        category: "portfolio",
        language: "sq",
        websiteType: "landing",
        userPrompt: "Portfolio site for photographer",
      },
    },
  },
  {
    id: "web-html-contract",
    toolId: "maro_web",
    description: "HTML parser contract for multi-page platform site",
    legacy: {
      toolId: "maro_web",
      userPrompt: "B2B platform marketing site",
      selections: { model: "opus-4-8", type: "platform", speed: "normal" },
      toolPrompts: { "website.base": DEFAULT_WEB_MASTER },
      masterPrompt: DEFAULT_WEB_MASTER,
      webBody: {
        businessName: "CloudOps",
        category: "generic",
        language: "en",
        websiteType: "platform",
        primaryColor: "#253FDA",
        userPrompt: "B2B platform marketing site",
      },
    },
    engine: {
      toolId: "maro_web",
      userPrompt: "B2B platform marketing site",
      selections: { model: "opus-4-8", type: "platform", speed: "normal" },
      webRequest: {
        businessName: "CloudOps",
        category: "generic",
        language: "en",
        websiteType: "platform",
        primaryColor: "#253FDA",
        userPrompt: "B2B platform marketing site",
      },
    },
  },
];
