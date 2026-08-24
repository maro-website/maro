import { describe, expect, it, vi } from "vitest";
import { MARO_UI_BRAND_COLOR } from "@/lib/ai/webBrandColor";
import {
  IMAGE_PARITY_MARKERS,
  IMAGE_TEXT_OFF_NO_REFERENCE,
  IMAGE_TEXT_OFF_WITH_REFERENCE,
  IMAGE_TEXT_OFF_WITH_WORKSPACE_BRAND_ASSET,
  WORKSPACE_BRAND_ASSET_DIRECTION,
  buildImageTextInstruction,
  buildImageTextOffInstruction,
  buildLegacyImageProviderRequest,
} from "@/lib/engine/imageCompile";
import { compileImazhFixture, SAMPLE_IMAZ_DATA_URL } from "@/lib/engine/imageParityFixtures";
import { legacyComposePrompt } from "@/lib/engine/legacyCompose";
import { DEFAULT_TOOL_PROMPTS, SAMPLE_WEB_BRAIN_PROFILE } from "@/lib/engine/parityFixtures";
import { buildImageStructuralDiff } from "@/lib/engine/shadowImageDiff";
import { buildImageLegacySnapshot } from "@/lib/engine/legacySnapshot";

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({ data: { id: "text-off-test" }, error: null }),
        }),
      }),
    }),
  }),
}));

const TEXT_OFF_SELECTIONS = {
  model: "gpt-image-2",
  format: "ig-post",
  text: "off",
  speed: "normal",
  font: "handwritten",
} as const;

describe("maroImazh Text OFF semantics", () => {
  it("A: Text OFF + no reference prohibits newly generated text only", () => {
    const instruction = buildImageTextOffInstruction(false);
    expect(instruction).toBe(IMAGE_TEXT_OFF_NO_REFERENCE);
    expect(instruction).toContain("Do not add any text");
    expect(instruction).not.toContain("preserved faithfully");

    const { legacyProvider, engineProvider } = compileImazhFixture({
      id: "text-off-no-ref",
      toolId: "maro_imazh",
      description: "text off without refs",
      legacy: {
        toolId: "maro_imazh",
        userPrompt: "Minimal product hero shot",
        selections: { ...TEXT_OFF_SELECTIONS },
        toolPrompts: DEFAULT_TOOL_PROMPTS,
      },
      engine: {
        toolId: "maro_imazh",
        userPrompt: "Minimal product hero shot",
        selections: { ...TEXT_OFF_SELECTIONS },
      },
    });

    expect(legacyProvider.prompt).toContain(IMAGE_TEXT_OFF_NO_REFERENCE);
    expect(engineProvider.prompt).toContain(IMAGE_TEXT_OFF_NO_REFERENCE);
    expect(legacyProvider.prompt).not.toContain(IMAGE_TEXT_OFF_WITH_REFERENCE);
    expect(engineProvider.prompt).not.toContain(IMAGE_TEXT_OFF_WITH_REFERENCE);
  });

  it("B: Text OFF + user product reference preserves existing branding typography", () => {
    const instruction = buildImageTextOffInstruction(true);
    expect(instruction).toBe(IMAGE_TEXT_OFF_WITH_REFERENCE);
    expect(instruction).toContain("Do not add any new text");
    expect(instruction).toContain("preserved faithfully");
    expect(instruction).toContain("Do not remove, rewrite, translate, replace or invent them");

    const { legacyProvider, engineProvider } = compileImazhFixture({
      id: "text-off-user-ref",
      toolId: "maro_imazh",
      description: "text off with user ref",
      legacy: {
        toolId: "maro_imazh",
        userPrompt: "Armani perfume bottle studio shot",
        selections: { ...TEXT_OFF_SELECTIONS },
        toolPrompts: DEFAULT_TOOL_PROMPTS,
        attachments: [{ type: "image/png", url: SAMPLE_IMAZ_DATA_URL }],
      },
      engine: {
        toolId: "maro_imazh",
        userPrompt: "Armani perfume bottle studio shot",
        selections: { ...TEXT_OFF_SELECTIONS },
        attachments: [{ type: "image/png", url: SAMPLE_IMAZ_DATA_URL }],
      },
    });

    expect(legacyProvider.prompt).toContain(IMAGE_TEXT_OFF_WITH_REFERENCE);
    expect(engineProvider.prompt).toContain(IMAGE_TEXT_OFF_WITH_REFERENCE);
    expect(legacyProvider.prompt).not.toContain(IMAGE_TEXT_OFF_NO_REFERENCE);
    expect(engineProvider.prompt).not.toContain(IMAGE_TEXT_OFF_NO_REFERENCE);
  });

  it("C: Text OFF + workspace_brain reference uses identity semantics, not product packaging", () => {
    const brainProfile = {
      ...SAMPLE_WEB_BRAIN_PROFILE,
      brand: { ...SAMPLE_WEB_BRAIN_PROFILE.brand, logoUrl: SAMPLE_IMAZ_DATA_URL },
    };
    const { legacyProvider, engineProvider } = compileImazhFixture({
      id: "text-off-brain-ref",
      toolId: "maro_imazh",
      description: "text off with brain logo ref",
      legacy: {
        toolId: "maro_imazh",
        userPrompt: "Brand-led social creative",
        selections: { ...TEXT_OFF_SELECTIONS },
        toolPrompts: DEFAULT_TOOL_PROMPTS,
        useBrain: true,
        brainProfile,
      },
      engine: {
        toolId: "maro_imazh",
        userPrompt: "Brand-led social creative",
        selections: { ...TEXT_OFF_SELECTIONS },
        useBrain: true,
      },
      context: { brainProfile },
      brainLogoUrl: SAMPLE_IMAZ_DATA_URL,
    });

    expect(legacyProvider.prompt).toContain(IMAGE_TEXT_OFF_WITH_WORKSPACE_BRAND_ASSET);
    expect(engineProvider.prompt).toContain(IMAGE_TEXT_OFF_WITH_WORKSPACE_BRAND_ASSET);
    expect(legacyProvider.prompt).toContain(WORKSPACE_BRAND_ASSET_DIRECTION);
    expect(engineProvider.prompt).toContain(WORKSPACE_BRAND_ASSET_DIRECTION);
    expect(legacyProvider.prompt).not.toContain(IMAGE_TEXT_OFF_WITH_REFERENCE);
    expect(engineProvider.prompt).not.toContain(IMAGE_TEXT_OFF_WITH_REFERENCE);
    expect(legacyProvider.prompt).not.toContain("packaging typography");
    expect(engineProvider.prompt).not.toContain("packaging typography");
  });

  it("D: Text OFF does not activate selected font typography", () => {
    const instruction = buildImageTextInstruction("maro_imazh", TEXT_OFF_SELECTIONS, {
      hasReferences: true,
    });
    expect(instruction).toBeDefined();
    expect(instruction).not.toContain("Handwritten");
    expect(instruction).not.toContain("typography style");
    expect(instruction).not.toContain(IMAGE_PARITY_MARKERS.textOn);
  });

  it("E: Text ON unchanged — requested text and font direction still apply", () => {
    const { legacyProvider, engineProvider } = compileImazhFixture({
      id: "text-on-font-regression",
      toolId: "maro_imazh",
      description: "text on with font",
      legacy: {
        toolId: "maro_imazh",
        userPrompt: "Summer sale creative",
        selections: {
          model: "gpt-image-2",
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
          model: "gpt-image-2",
          format: "ig-story",
          text: "on",
          font: "bold",
          speed: "normal",
        },
      },
    });

    expect(legacyProvider.prompt).toContain(IMAGE_PARITY_MARKERS.textOn);
    expect(engineProvider.prompt).toContain(IMAGE_PARITY_MARKERS.textOn);
    expect(legacyProvider.prompt).toContain("Bold Display typography style");
    expect(engineProvider.prompt).toContain("Bold Display typography style");
    expect(legacyProvider.prompt).not.toContain(IMAGE_TEXT_OFF_NO_REFERENCE);
    expect(engineProvider.prompt).not.toContain(IMAGE_TEXT_OFF_WITH_REFERENCE);
  });

  it("F: legacy and Engine produce equivalent text-off instruction strings", () => {
    for (const hasReferences of [false, true]) {
      const legacy = buildLegacyImageProviderRequest({
        toolId: "maro_imazh",
        userPrompt: "Product shot",
        selections: TEXT_OFF_SELECTIONS,
        toolPrompts: DEFAULT_TOOL_PROMPTS,
        model: "gpt-image-2",
        attachments: hasReferences ? [SAMPLE_IMAZ_DATA_URL] : undefined,
        brainLogoUrl: hasReferences ? undefined : undefined,
      });
      const engine = buildLegacyImageProviderRequest({
        toolId: "maro_imazh",
        userPrompt: "Product shot",
        selections: TEXT_OFF_SELECTIONS,
        toolPrompts: DEFAULT_TOOL_PROMPTS,
        model: "gpt-image-2",
        attachments: hasReferences ? [SAMPLE_IMAZ_DATA_URL] : undefined,
      });
      const expected = buildImageTextOffInstruction(hasReferences);
      expect(legacy.prompt).toContain(expected);
      expect(engine.prompt).toContain(expected);
    }
  });

  it("G: user-reference structural parity fixtures remain critical-clean", () => {
    const { legacyProvider, engineProvider } = compileImazhFixture({
      id: "text-off-user-ref-parity",
      toolId: "maro_imazh",
      description: "user ref parity",
      legacy: {
        toolId: "maro_imazh",
        userPrompt: "Use attached perfume bottle",
        selections: { ...TEXT_OFF_SELECTIONS },
        toolPrompts: DEFAULT_TOOL_PROMPTS,
        attachments: [{ type: "image/png", url: SAMPLE_IMAZ_DATA_URL }],
      },
      engine: {
        toolId: "maro_imazh",
        userPrompt: "Use attached perfume bottle",
        selections: { ...TEXT_OFF_SELECTIONS },
        attachments: [{ type: "image/png", url: SAMPLE_IMAZ_DATA_URL }],
      },
    });

    const legacySnap = buildImageLegacySnapshot({
      finalPrompt: legacyProvider.prompt,
      model: "gpt-image-2",
      imageProvider: legacyProvider,
    });
    const engineSnap = buildImageLegacySnapshot({
      finalPrompt: engineProvider.prompt,
      model: "gpt-image-2",
      imageProvider: engineProvider,
    });
    const diff = buildImageStructuralDiff(legacySnap, engineSnap, {});
    expect(diff.hasCriticalMismatch).toBe(false);
    expect(diff.criticalFlags).toEqual([]);
    expect(legacyProvider.operation).toBe("edit");
    expect(engineProvider.operation).toBe("edit");
    expect(legacyProvider.referenceCountUsed).toBe(1);
    expect(engineProvider.referenceCountUsed).toBe(1);
  });

  it("H: no client/Maro branding injection in text-off prompts", () => {
    const legacy = legacyComposePrompt({
      toolId: "maro_imazh",
      userPrompt: "Neutral packshot",
      selections: { ...TEXT_OFF_SELECTIONS },
      toolPrompts: DEFAULT_TOOL_PROMPTS,
      attachments: [{ type: "image/png", url: SAMPLE_IMAZ_DATA_URL }],
    });
    expect(legacy.prompt).not.toContain(MARO_UI_BRAND_COLOR);
    expect(legacy.prompt).not.toMatch(/maro logo/i);
    expect(legacy.prompt).not.toContain("#253FDA");
  });
});
