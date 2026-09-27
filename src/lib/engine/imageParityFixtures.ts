/**
 * maroImazh parity fixtures — deterministic legacy vs Engine semantic comparison.
 */

import { compileGenerationBrief } from "./compiler";
import { buildNormalizedFromBrief } from "./adapters/openaiImage";
import { legacyComposePrompt, type LegacyComposeResult } from "./legacyCompose";
import {
  buildLegacyImageProviderRequest,
  type NormalizedOpenAIImageRequest,
} from "./imageCompile";
import {
  buildBrainBrief,
  buildMatchedSourcesBrief,
  matchSourcesByPrompt,
} from "@/lib/workspaces/brainProfile";
import { buildWorkspaceBrandBrief, normalizeWorkspaceBrand } from "@/lib/workspaces/brand";
import {
  buildTestContext,
  DEFAULT_TOOL_PROMPTS,
  SAMPLE_WEB_BRAIN_PROFILE,
  type ParityFixture,
} from "./parityFixtures";
import type { CompileGenerationBriefInput, EngineCompileContext, EngineToolId } from "./types";
import type { WorkspaceSource } from "@/lib/workspaces/brainTypes";

export const SAMPLE_IMAZ_DATA_URL = "data:image/png;base64,AAAA";
export const SAMPLE_IMAZ_HTTP_REF = "https://cdn.example.com/product.png";

export const SAMPLE_IMAZ_SOURCES: WorkspaceSource[] = [
  {
    id: "src-1",
    workspaceId: "ws-1",
    name: "Product packshot",
    fileUrl: SAMPLE_IMAZ_HTTP_REF,
    keywords: "product, packshot",
    createdAt: new Date().toISOString(),
  },
];

export function buildImazhTestContext(overrides?: Partial<EngineCompileContext>): EngineCompileContext {
  return {
    ...buildTestContext("maro_imazh"),
    ...overrides,
  };
}

export interface ImazhParityFixture extends ParityFixture {
  quality?: "high" | "medium" | "low";
  n?: number;
  explicitSize?: import("@/lib/tools/registry").ImageSize;
  brainLogoUrl?: string;
  matchedSourceUrls?: string[];
  fetchedUrls?: string[];
}

const IMAZ_MODEL = "gpt-image-2";

export const IMAZH_PARITY_FIXTURES: ImazhParityFixture[] = [
  {
    id: "imazh-simple",
    toolId: "maro_imazh",
    description: "Prompt-only generate",
    legacy: {
      toolId: "maro_imazh",
      userPrompt: "Premium coffee bag on marble surface",
      selections: { model: IMAZ_MODEL, format: "ig-post", text: "off", speed: "normal" },
      toolPrompts: DEFAULT_TOOL_PROMPTS,
    },
    engine: {
      toolId: "maro_imazh",
      userPrompt: "Premium coffee bag on marble surface",
      selections: { model: IMAZ_MODEL, format: "ig-post", text: "off", speed: "normal" },
    },
  },
  {
    id: "imazh-format-size",
    toolId: "maro_imazh",
    description: "YouTube thumbnail format maps to 1536x1024",
    legacy: {
      toolId: "maro_imazh",
      userPrompt: "Tech review thumbnail",
      selections: { model: IMAZ_MODEL, format: "yt-thumb", text: "off", speed: "normal" },
      toolPrompts: DEFAULT_TOOL_PROMPTS,
    },
    engine: {
      toolId: "maro_imazh",
      userPrompt: "Tech review thumbnail",
      selections: { model: IMAZ_MODEL, format: "yt-thumb", text: "off", speed: "normal" },
    },
  },
  {
    id: "imazh-text-off",
    toolId: "maro_imazh",
    description: "Text explicitly off",
    legacy: {
      toolId: "maro_imazh",
      userPrompt: "Minimal product hero shot",
      selections: { model: IMAZ_MODEL, format: "fb-post", text: "off", speed: "normal" },
      toolPrompts: DEFAULT_TOOL_PROMPTS,
    },
    engine: {
      toolId: "maro_imazh",
      userPrompt: "Minimal product hero shot",
      selections: { model: IMAZ_MODEL, format: "fb-post", text: "off", speed: "normal" },
    },
  },
  {
    id: "imazh-text-on-font",
    toolId: "maro_imazh",
    description: "Text on with bold font",
    legacy: {
      toolId: "maro_imazh",
      userPrompt: "Summer sale creative",
      selections: {
        model: IMAZ_MODEL,
        format: "ig-story",
        text: "on",
        font: "bold",
        speed: "normal",
      },
      toolPrompts: DEFAULT_TOOL_PROMPTS,
    },
    engine: {
      toolId: "maro_imazh",
      userPrompt: "Summer sale creative",
      selections: {
        model: IMAZ_MODEL,
        format: "ig-story",
        text: "on",
        font: "bold",
        speed: "normal",
      },
    },
  },
  {
    id: "imazh-single-ref-edit",
    toolId: "maro_imazh",
    description: "Single user reference → edit",
    legacy: {
      toolId: "maro_imazh",
      userPrompt: "Place product in lifestyle scene",
      selections: { model: IMAZ_MODEL, format: "fb-post", text: "off", speed: "normal" },
      toolPrompts: DEFAULT_TOOL_PROMPTS,
      attachments: [{ type: "image/png", url: SAMPLE_IMAZ_DATA_URL }],
    },
    engine: {
      toolId: "maro_imazh",
      userPrompt: "Place product in lifestyle scene",
      selections: { model: IMAZ_MODEL, format: "fb-post", text: "off", speed: "normal" },
      attachments: [{ type: "image/png", url: SAMPLE_IMAZ_DATA_URL }],
    },
  },
  {
    id: "imazh-multi-ref-order",
    toolId: "maro_imazh",
    description: "Multiple refs preserve order up to limit",
    legacy: {
      toolId: "maro_imazh",
      userPrompt: "Composite ad with product lineup",
      selections: { model: IMAZ_MODEL, format: "ig-post", text: "off", speed: "normal" },
      toolPrompts: DEFAULT_TOOL_PROMPTS,
      attachments: [
        { type: "image/png", url: "data:image/png;base64,REF1" },
        { type: "image/jpeg", url: "data:image/jpeg;base64,REF2" },
        { type: "image/png", url: "data:image/png;base64,REF3" },
        { type: "image/png", url: "data:image/png;base64,REF4" },
        { type: "image/png", url: "data:image/png;base64,REF5" },
      ],
    },
    engine: {
      toolId: "maro_imazh",
      userPrompt: "Composite ad with product lineup",
      selections: { model: IMAZ_MODEL, format: "ig-post", text: "off", speed: "normal" },
      attachments: [
        { type: "image/png", url: "data:image/png;base64,REF1" },
        { type: "image/jpeg", url: "data:image/jpeg;base64,REF2" },
        { type: "image/png", url: "data:image/png;base64,REF3" },
        { type: "image/png", url: "data:image/png;base64,REF4" },
        { type: "image/png", url: "data:image/png;base64,REF5" },
      ],
    },
  },
  {
    id: "imazh-fort",
    toolId: "maro_imazh",
    description: "maroFort layers + expert brief",
    legacy: {
      toolId: "maro_imazh",
      userPrompt: "Luxury skincare campaign visual",
      selections: { model: IMAZ_MODEL, format: "ig-post", text: "off", speed: "normal" },
      toolPrompts: DEFAULT_TOOL_PROMPTS,
      fort: { enabled: true, values: { objective: "premium", mood: "calm" } },
    },
    engine: {
      toolId: "maro_imazh",
      userPrompt: "Luxury skincare campaign visual",
      selections: { model: IMAZ_MODEL, format: "ig-post", text: "off", speed: "normal" },
      fort: { enabled: true, values: { objective: "premium", mood: "calm" } },
    },
  },
  {
    id: "imazh-brain",
    toolId: "maro_imazh",
    description: "Workspace brand/brain context",
    legacy: {
      toolId: "maro_imazh",
      userPrompt: "Product launch ad for workflow tool",
      selections: { model: IMAZ_MODEL, format: "fb-post", text: "off", speed: "normal" },
      toolPrompts: DEFAULT_TOOL_PROMPTS,
      useBrain: true,
      brainProfile: SAMPLE_WEB_BRAIN_PROFILE,
      sources: SAMPLE_IMAZ_SOURCES,
    },
    engine: {
      toolId: "maro_imazh",
      userPrompt: "Product launch ad for workflow tool",
      selections: { model: IMAZ_MODEL, format: "fb-post", text: "off", speed: "normal" },
      useBrain: true,
    },
    context: { brainProfile: SAMPLE_WEB_BRAIN_PROFILE, brainSources: SAMPLE_IMAZ_SOURCES },
  },
  {
    id: "imazh-fort-brain",
    toolId: "maro_imazh",
    description: "maroFort + maroBrain combined",
    legacy: {
      toolId: "maro_imazh",
      userPrompt: "Enterprise SaaS hero visual",
      selections: { model: IMAZ_MODEL, format: "yt-thumb", text: "off", speed: "normal" },
      toolPrompts: DEFAULT_TOOL_PROMPTS,
      fort: { enabled: true, values: { objective: "trust", tone: "bold" } },
      useBrain: true,
      brainProfile: SAMPLE_WEB_BRAIN_PROFILE,
    },
    engine: {
      toolId: "maro_imazh",
      userPrompt: "Enterprise SaaS hero visual",
      selections: { model: IMAZ_MODEL, format: "yt-thumb", text: "off", speed: "normal" },
      fort: { enabled: true, values: { objective: "trust", tone: "bold" } },
      useBrain: true,
    },
    context: { brainProfile: SAMPLE_WEB_BRAIN_PROFILE },
  },
  {
    id: "imazh-preset",
    toolId: "maro_imazh",
    description: "maroPrompt preset prepended server-side",
    legacy: {
      toolId: "maro_imazh",
      userPrompt: "Apply brand style to product shot",
      selections: { model: IMAZ_MODEL, format: "ig-post", text: "off", speed: "normal" },
      toolPrompts: DEFAULT_TOOL_PROMPTS,
      presetPrompt: "Curated preset: cinematic product lighting, shallow depth of field.",
    },
    engine: {
      toolId: "maro_imazh",
      userPrompt: "Apply brand style to product shot",
      selections: { model: IMAZ_MODEL, format: "ig-post", text: "off", speed: "normal" },
      presetId: "preset-cinematic",
      presetPrompt: "Curated preset: cinematic product lighting, shallow depth of field.",
    },
  },
  {
    id: "imazh-n-quality",
    toolId: "maro_imazh",
    description: "n=3 and quality high",
    quality: "high",
    n: 3,
    legacy: {
      toolId: "maro_imazh",
      userPrompt: "Variant packshot angles",
      selections: { model: IMAZ_MODEL, format: "fb-post", text: "off", speed: "normal" },
      toolPrompts: DEFAULT_TOOL_PROMPTS,
    },
    engine: {
      toolId: "maro_imazh",
      userPrompt: "Variant packshot angles",
      selections: { model: IMAZ_MODEL, format: "fb-post", text: "off", speed: "normal" },
      n: 3,
      quality: "high",
    },
  },
  {
    id: "imazh-ref-fallback",
    toolId: "maro_imazh",
    description: "Refs requested but none usable → generate fallback visible",
    legacy: {
      toolId: "maro_imazh",
      userPrompt: "Product in studio",
      selections: { model: IMAZ_MODEL, format: "ig-post", text: "off", speed: "normal" },
      toolPrompts: DEFAULT_TOOL_PROMPTS,
      attachments: [{ type: "image/png", url: SAMPLE_IMAZ_HTTP_REF }],
    },
    engine: {
      toolId: "maro_imazh",
      userPrompt: "Product in studio",
      selections: { model: IMAZ_MODEL, format: "ig-post", text: "off", speed: "normal" },
      attachments: [{ type: "image/png", url: SAMPLE_IMAZ_HTTP_REF }],
    },
    fetchedUrls: [],
  },
  {
    id: "imazh-brain-logo-ref",
    toolId: "maro_imazh",
    description: "Brain logo URL becomes edit ref without IMPORTANT line",
    legacy: {
      toolId: "maro_imazh",
      userPrompt: "Brand-led social creative",
      selections: { model: IMAZ_MODEL, format: "ig-post", text: "off", speed: "normal" },
      toolPrompts: DEFAULT_TOOL_PROMPTS,
      useBrain: true,
      brainProfile: {
        ...SAMPLE_WEB_BRAIN_PROFILE,
        brand: { ...SAMPLE_WEB_BRAIN_PROFILE.brand, logoUrl: SAMPLE_IMAZ_DATA_URL },
      },
    },
    engine: {
      toolId: "maro_imazh",
      userPrompt: "Brand-led social creative",
      selections: { model: IMAZ_MODEL, format: "ig-post", text: "off", speed: "normal" },
      useBrain: true,
    },
    context: {
      brainProfile: {
        ...SAMPLE_WEB_BRAIN_PROFILE,
        brand: { ...SAMPLE_WEB_BRAIN_PROFILE.brand, logoUrl: SAMPLE_IMAZ_DATA_URL },
      },
    },
    brainLogoUrl: SAMPLE_IMAZ_DATA_URL,
  },
  {
    id: "imazh-brand-only",
    toolId: "maro_imazh",
    description: "Workspace brand-only fallback without brain profile",
    legacy: {
      toolId: "maro_imazh",
      userPrompt: "Social post for workspace brand",
      selections: { model: IMAZ_MODEL, format: "fb-post", text: "off", speed: "normal" },
      toolPrompts: DEFAULT_TOOL_PROMPTS,
      useBrain: true,
      workspaceBrandBrief: buildWorkspaceBrandBrief(
        normalizeWorkspaceBrand({ name: "Acme Co", primaryColor: "#FF5500" })
      ),
    },
    engine: {
      toolId: "maro_imazh",
      userPrompt: "Social post for workspace brand",
      selections: { model: IMAZ_MODEL, format: "fb-post", text: "off", speed: "normal" },
      useBrain: true,
      workspaceBrandBrief: buildWorkspaceBrandBrief(
        normalizeWorkspaceBrand({ name: "Acme Co", primaryColor: "#FF5500" })
      ),
    },
    context: { brainProfile: null },
  },
];

export function buildLegacyProviderRequest(
  fixture: ImazhParityFixture,
  legacyResult: LegacyComposeResult
): NormalizedOpenAIImageRequest {
  const matched =
    fixture.legacy.useBrain && fixture.legacy.sources?.length
      ? matchSourcesByPrompt(fixture.legacy.userPrompt, fixture.legacy.sources)
      : [];
  const matchedSourceUrls =
    fixture.matchedSourceUrls ??
    (matched.length ? matched.map((s) => s.fileUrl).filter(Boolean) : undefined);
  const brainLogoUrl =
    fixture.brainLogoUrl ?? fixture.legacy.brainProfile?.brand.logoUrl ?? undefined;
  return buildLegacyImageProviderRequest({
    toolId: fixture.toolId,
    userPrompt: fixture.legacy.userPrompt,
    selections: fixture.legacy.selections,
    toolPrompts: fixture.legacy.toolPrompts,
    model: IMAZ_MODEL,
    presetPrompt: fixture.legacy.presetPrompt,
    attachments: fixture.legacy.attachments,
    fortLayerText: legacyResult.fortLayerText,
    fortExpertBrief: legacyResult.fortExpertBrief,
    brainBrief:
      fixture.legacy.useBrain && fixture.legacy.brainProfile
        ? buildBrainBrief(fixture.legacy.brainProfile)
        : undefined,
    matchedSourcesBrief: matched.length ? buildMatchedSourcesBrief(matched) : undefined,
    workspaceBrandBrief: fixture.legacy.workspaceBrandBrief ?? fixture.engine.workspaceBrandBrief,
    brainLogoUrl,
    matchedSourceUrls,
    fetchedUrls: fixture.fetchedUrls ? new Set(fixture.fetchedUrls) : undefined,
    quality: fixture.quality,
    n: fixture.n,
    size: fixture.explicitSize,
  });
}

export function compileImazhFixture(fixture: ImazhParityFixture) {
  const ctx = buildImazhTestContext(fixture.context);
  const engineInput = {
    ...fixture.engine,
    useBrain: fixture.engine.useBrain ?? fixture.legacy.useBrain ?? false,
    quality: fixture.quality ?? fixture.engine.quality,
    n: fixture.n ?? fixture.engine.n,
    workspaceBrandBrief: fixture.engine.workspaceBrandBrief,
  };
  const brief = compileGenerationBrief(engineInput, ctx);
  const legacy = legacyComposePrompt(fixture.legacy);
  const legacyProvider = buildLegacyProviderRequest(fixture, legacy);
  const matched =
    fixture.legacy.useBrain && fixture.legacy.sources?.length
      ? matchSourcesByPrompt(fixture.legacy.userPrompt, fixture.legacy.sources)
      : [];
  const matchedSourceUrls =
    fixture.matchedSourceUrls ??
    (matched.length ? matched.map((s) => s.fileUrl).filter(Boolean) : undefined);
  const brainLogoUrl =
    fixture.brainLogoUrl ?? fixture.legacy.brainProfile?.brand.logoUrl ?? undefined;
  const engineProvider = buildNormalizedFromBrief(brief, engineInput, ctx, {
    quality: fixture.quality ?? fixture.engine.quality,
    n: fixture.n ?? fixture.engine.n,
    brainLogoUrl,
    matchedSourceUrls,
    fetchedUrls: fixture.fetchedUrls ? new Set(fixture.fetchedUrls) : undefined,
    workspaceBrandBrief: engineInput.workspaceBrandBrief,
  });
  return { ctx, brief, legacy, legacyProvider, engineProvider };
}
