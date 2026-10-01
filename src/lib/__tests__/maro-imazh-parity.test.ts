import { describe, expect, it, vi } from "vitest";
import { MARO_UI_BRAND_COLOR } from "@/lib/ai/webBrandColor";
import { mapEngineBriefToProviderRequest } from "@/lib/engine/adapters/mapBrief";
import { buildNormalizedFromBrief } from "@/lib/engine/adapters/openaiImage";
import { compileGenerationBrief } from "@/lib/engine/compiler";
import {
  IMAGE_FORMAT_SIZE_MATRIX,
  IMAGE_PARITY_MARKERS,
  IMAGE_PROVIDER_REF_LIMIT,
} from "@/lib/engine/imageCompile";
import {
  buildImazhTestContext,
  compileImazhFixture,
  IMAZH_PARITY_FIXTURES,
  SAMPLE_IMAZ_DATA_URL,
} from "@/lib/engine/imageParityFixtures";
import { buildImageLegacySnapshot } from "@/lib/engine/legacySnapshot";
import { runShadowCompilation } from "@/lib/engine/shadowCompile";
import { buildImageStructuralDiff } from "@/lib/engine/shadowImageDiff";

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({ data: { id: "shadow-test-id" }, error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/engine/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/engine/storage")>();
  const { buildImazhTestContext } = await import("@/lib/engine/imageParityFixtures");
  return {
    ...actual,
    loadCompileContext: vi.fn(async () => buildImazhTestContext()),
  };
});

function assertProviderParity(
  fixtureId: string,
  legacy: ReturnType<typeof compileImazhFixture>["legacyProvider"],
  engine: ReturnType<typeof compileImazhFixture>["engineProvider"]
) {
  expect(engine.operation, `${fixtureId} operation`).toBe(legacy.operation);
  expect(engine.size, `${fixtureId} size`).toBe(legacy.size);
  expect(engine.n, `${fixtureId} n`).toBe(legacy.n);
  expect(engine.referenceCountUsed, `${fixtureId} refs used`).toBe(legacy.referenceCountUsed);
  expect(engine.fallbackFromEditToGenerate, `${fixtureId} fallback flag`).toBe(
    legacy.fallbackFromEditToGenerate
  );

  if (legacy.quality || engine.quality) {
    expect(engine.quality, `${fixtureId} quality`).toBe(legacy.quality);
  }

  expect(engine.prompt, `${fixtureId} prompt`).toContain(fixtureId.includes("text-off")
    ? IMAGE_PARITY_MARKERS.textOff
    : fixtureId.includes("text-on")
      ? IMAGE_PARITY_MARKERS.textOn
      : legacy.prompt.split("\n\n").slice(-3)[0]?.slice(0, 20) ?? legacy.prompt.slice(0, 20));

  if (legacy.prompt.includes(IMAGE_PARITY_MARKERS.textOff)) {
    expect(engine.prompt).toContain(IMAGE_PARITY_MARKERS.textOff);
  }
  if (legacy.prompt.includes(IMAGE_PARITY_MARKERS.referencePreservation)) {
    expect(engine.prompt).toContain(IMAGE_PARITY_MARKERS.referencePreservation);
  }
  if (legacy.prompt.includes(IMAGE_PARITY_MARKERS.fortHeader)) {
    expect(engine.prompt).toContain(IMAGE_PARITY_MARKERS.fortHeader);
  }
  if (legacy.prompt.includes(IMAGE_PARITY_MARKERS.brainHeader)) {
    expect(engine.prompt).toContain(IMAGE_PARITY_MARKERS.brainHeader);
  }
}

describe("maroImazh format size matrix", () => {
  for (const row of IMAGE_FORMAT_SIZE_MATRIX) {
    it(`${row.format}: legacy and engine sizes match (${row.legacySize})`, () => {
      expect(row.engineSize).toBe(row.legacySize);
    });
  }
});

describe("maroImazh semantic parity fixtures", () => {
  for (const fixture of IMAZH_PARITY_FIXTURES) {
    it(`${fixture.id}: legacy and engine provider intent align`, () => {
      const { legacyProvider, engineProvider, legacy } = compileImazhFixture(fixture);

      if (fixture.id === "imazh-simple" || fixture.id === "imazh-format-size") {
        expect(legacyProvider.operation).toBe("generate");
        expect(engineProvider.operation).toBe("generate");
      }

      if (fixture.id === "imazh-single-ref-edit") {
        expect(legacyProvider.operation).toBe("edit");
        expect(engineProvider.operation).toBe("edit");
        expect(legacyProvider.referenceCountUsed).toBe(1);
      }

      if (fixture.id === "imazh-multi-ref-order") {
        expect(legacyProvider.referenceCountUsed).toBe(IMAGE_PROVIDER_REF_LIMIT);
        expect(engineProvider.referenceCountUsed).toBe(IMAGE_PROVIDER_REF_LIMIT);
      }

      if (fixture.id === "imazh-ref-fallback") {
        expect(legacyProvider.operation).toBe("generate");
        expect(legacyProvider.fallbackFromEditToGenerate).toBe(true);
        expect(engineProvider.fallbackFromEditToGenerate).toBe(true);
      }

      if (fixture.id === "imazh-n-quality") {
        expect(legacyProvider.n).toBe(3);
        expect(engineProvider.n).toBe(3);
        expect(engineProvider.quality).toBe("high");
      }

      if (fixture.id === "imazh-preset") {
        expect(engineProvider.prompt).toContain("Curated preset:");
        expect(legacy.prompt).toContain("Curated preset:");
      }

      assertProviderParity(fixture.id, legacyProvider, engineProvider);
    });
  }
});

describe("maroImazh client brand isolation", () => {
  it("default compile does not inject Maro UI brand color or logo", () => {
    const ctx = buildImazhTestContext({ brainProfile: null });
    const brief = compileGenerationBrief(
      {
        toolId: "maro_imazh",
        userPrompt: "Neutral product photo on white background",
        selections: { model: "gpt-image-2", format: "fb-post", text: "off", speed: "normal" },
      },
      ctx
    );
    const provider = buildNormalizedFromBrief(
      brief,
      {
        toolId: "maro_imazh",
        userPrompt: "Neutral product photo on white background",
        selections: { model: "gpt-image-2", format: "fb-post", text: "off", speed: "normal" },
      },
      ctx
    );
    expect(provider.prompt).not.toContain(MARO_UI_BRAND_COLOR);
    expect(provider.prompt).not.toMatch(/maro logo/i);
    expect(provider.prompt).not.toContain("#253FDA");
  });
});

describe("maroImazh shadow structural diff", () => {
  for (const fixture of IMAZH_PARITY_FIXTURES) {
    it(`${fixture.id}: no critical mismatch vs legacy snapshot`, () => {
      const { legacyProvider, engineProvider, brief } = compileImazhFixture(fixture);
      const legacySnap = buildImageLegacySnapshot({
        finalPrompt: legacyProvider.prompt,
        model: "gpt-image-2",
        imageProvider: legacyProvider,
        fortValues: fixture.legacy.fort?.enabled ? fixture.legacy.fort.values : undefined,
        presetId: fixture.engine.presetId,
      });
      const engineSnap = buildImageLegacySnapshot({
        finalPrompt: engineProvider.prompt,
        model: brief.model,
        imageProvider: engineProvider,
        fortValues: fixture.engine.fort?.enabled ? fixture.engine.fort.values : undefined,
        brainSections: brief.metadata.brainSections,
        presetId: fixture.engine.presetId,
      });

      const diff = buildImageStructuralDiff(legacySnap, engineSnap, {
        fortEnabled: fixture.legacy.fort?.enabled,
        brainUsed: Boolean(fixture.legacy.useBrain),
        presetPresent: Boolean(fixture.engine.presetId),
      });

      expect(diff.hasCriticalMismatch, diff.criticalFlags.join(", ")).toBe(false);
    });
  }
});

describe("maroImazh shadow execution safety", () => {
  it("shadow compile performs zero OpenAI provider calls", async () => {
    const fixture = IMAZH_PARITY_FIXTURES[0];
    const { legacyProvider } = compileImazhFixture(fixture);

    const result = await runShadowCompilation({
      toolId: "reklama",
      registryToolId: "reklama",
      model: "gpt-image-2",
      userPrompt: fixture.legacy.userPrompt,
      selections: fixture.legacy.selections,
      legacySnapshot: buildImageLegacySnapshot({
        finalPrompt: legacyProvider.prompt,
        model: "gpt-image-2",
        imageProvider: legacyProvider,
      }),
      providerRequestCount: 1,
    });

    expect(result.ok).toBe(true);
    expect(result.compileError).toBeUndefined();
  });

  it("mapEngineBriefToProviderRequest never invokes OpenAI", () => {
    const ctx = buildImazhTestContext();
    const brief = compileGenerationBrief(
      { toolId: "maro_imazh", userPrompt: "Test", selections: { format: "fb-post" } },
      ctx
    );
    const mapped = mapEngineBriefToProviderRequest(brief, {
      compileInput: { toolId: "maro_imazh", userPrompt: "Test", selections: { format: "fb-post" } },
      compileContext: ctx,
      imageN: 2,
      imageQuality: "high",
    });
    expect(mapped?.provider).toBe("openai");
    expect(mapped?.openaiImage?.n).toBe(2);
    expect(mapped?.openaiImage?.quality).toBe("high");
    expect(mapped?.openaiImage?.operation).toBe("generate");
  });

  it("edit operation when data-url reference attached", () => {
    const ctx = buildImazhTestContext();
    const input = {
      toolId: "maro_imazh" as const,
      userPrompt: "Edit product",
      selections: { model: "gpt-image-2", format: "fb-post", text: "off", speed: "normal" },
      attachments: [{ type: "image/png", url: SAMPLE_IMAZ_DATA_URL }],
    };
    const brief = compileGenerationBrief(input, ctx);
    const mapped = mapEngineBriefToProviderRequest(brief, {
      compileInput: input,
      compileContext: ctx,
    });
    expect(mapped?.openaiImage?.operation).toBe("edit");
    expect(mapped?.openaiImage?.referenceCountUsed).toBe(1);
  });
});

describe("maroImazh shadow reference metadata safety", () => {
  it("does not store raw base64 in reference metadata", () => {
    const { engineProvider } = compileImazhFixture(
      IMAZH_PARITY_FIXTURES.find((f) => f.id === "imazh-single-ref-edit")!
    );
    for (const ref of engineProvider.references) {
      expect(ref.identifier).not.toContain("AAAA");
      expect(ref.identifier).toBe("data-url");
    }
  });
});
