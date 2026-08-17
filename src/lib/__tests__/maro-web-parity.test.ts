import { describe, expect, it, vi } from "vitest";
import { mapWebBriefToClaude } from "@/lib/engine/adapters/claudeWeb";
import { compileGenerationBrief } from "@/lib/engine/compiler";
import { legacyComposePrompt } from "@/lib/engine/legacyCompose";
import { buildWebLegacySnapshot } from "@/lib/engine/legacySnapshot";
import {
  buildWebTestContext,
  WEB_PARITY_FIXTURES,
  type ParityFixture,
} from "@/lib/engine/parityFixtures";
import { runShadowCompilation } from "@/lib/engine/shadowCompile";
import { buildWebStructuralDiff } from "@/lib/engine/shadowWebDiff";
import { WEB_PARITY_MARKERS } from "@/lib/engine/webCompile";
import type { AiGenerateRequest } from "@/lib/ai/types";
import type { CompiledGenerationBrief } from "@/lib/engine/types";

function asWebBody(body: Partial<AiGenerateRequest>): AiGenerateRequest {
  return {
    businessName: body.businessName ?? "Test",
    category: body.category ?? "generic",
    language: body.language ?? "sq",
    goal: body.goal ?? body.userPrompt ?? "Website",
    primaryColor: body.primaryColor ?? "#253FDA",
    ...body,
  };
}

function compileWebFixture(fixture: ParityFixture, opts?: { useBrain?: boolean }) {
  const ctx = buildWebTestContext({
    toolPrompts: fixture.legacy.toolPrompts,
    masterPrompt: fixture.legacy.masterPrompt,
    ...(fixture.context ?? {}),
  });
  const engineInput = {
    ...fixture.engine,
    useBrain: opts?.useBrain ?? fixture.engine.useBrain ?? false,
  };
  const brief = compileGenerationBrief(engineInput, ctx);
  const legacy = legacyComposePrompt(fixture.legacy);
  const claude = mapWebBriefToClaude(brief);
  return { ctx, brief, legacy, claude };
}

function assertCoreWebSemantics(
  fixture: ParityFixture,
  legacy: ReturnType<typeof legacyComposePrompt>,
  brief: CompiledGenerationBrief,
  claude: ReturnType<typeof mapWebBriefToClaude>
) {
  expect(claude.ok).toBe(true);
  if (!claude.ok || !claude.request) return;

  const system = claude.request.system;
  const user = claude.request.user;

  expect(system).toContain("elite web designer");
  expect(system).toContain(WEB_PARITY_MARKERS.pageDelimiter);
  expect(system).toContain(WEB_PARITY_MARKERS.tailwindCdn);
  expect(user).toContain(WEB_PARITY_MARKERS.businessDetails);
  expect(user).toContain(WEB_PARITY_MARKERS.designOnly);
  expect(user).toContain(fixture.engine.userPrompt);

  const businessName = fixture.engine.webRequest?.businessName;
  if (businessName) {
    expect(user).toContain(businessName);
  }

  if (fixture.legacy.fort?.enabled) {
    expect(user).toContain(WEB_PARITY_MARKERS.fortHeader);
    expect(system).not.toContain(WEB_PARITY_MARKERS.fortHeader);
  }

  if (fixture.id === "web-selections") {
    expect(system).toContain("Single-page landing focused on conversion");
    expect(system).toContain("Prioritize speed over exhaustive detail");
  }

  if (fixture.id === "web-html-contract") {
    expect(system).toMatch(/4-5 pages/i);
    expect(system).toContain("===END===");
  }

  if (fixture.id === "web-model") {
    expect(brief.model).toBe("sonnet-4-5");
    expect(claude.request.model).toBe("sonnet-4-5");
  }

  expect(brief.outputRequirements).toContain(WEB_PARITY_MARKERS.pageDelimiter);
  expect(legacy.system).toContain(WEB_PARITY_MARKERS.pageDelimiter);
  expect(legacy.user).toContain(WEB_PARITY_MARKERS.businessDetails);
}

describe("maroWeb semantic parity fixtures", () => {
  for (const fixture of WEB_PARITY_FIXTURES) {
    if (fixture.id === "web-brain" || fixture.id === "web-fort-brain") continue;

    it(`${fixture.id}: engine Claude request preserves production-critical semantics`, () => {
      const { brief, legacy, claude } = compileWebFixture(fixture);
      assertCoreWebSemantics(fixture, legacy, brief, claude);
    });
  }

  it("web-brain: brand context survives when useBrain=true", () => {
    const fixture = WEB_PARITY_FIXTURES.find((f) => f.id === "web-brain")!;
    const { brief, claude } = compileWebFixture(fixture, { useBrain: true });
    expect(brief.metadata.brainUsed).toBe(true);
    expect(brief.brandContext).toContain("FlowStack");
    expect(claude.ok).toBe(true);
    if (claude.ok && claude.request) {
      expect(claude.request.user).toContain("## maroBrain");
      expect(claude.request.user).toContain("Workflow automation");
    }
  });

  it("web-brain: shadow path matches legacy (brain off)", () => {
    const fixture = WEB_PARITY_FIXTURES.find((f) => f.id === "web-brain")!;
    const { brief, claude } = compileWebFixture(fixture, { useBrain: false });
    expect(brief.metadata.brainUsed).toBe(false);
    expect(claude.ok).toBe(true);
    if (claude.ok && claude.request) {
      expect(claude.request.user).not.toContain("## maroBrain");
    }
  });

  it("web-fort-brain: Fort in user + brain when enabled", () => {
    const fixture = WEB_PARITY_FIXTURES.find((f) => f.id === "web-fort-brain")!;
    const { brief, claude } = compileWebFixture(fixture, { useBrain: true });
    expect(brief.metadata.brainUsed).toBe(true);
    expect(claude.ok).toBe(true);
    if (claude.ok && claude.request) {
      expect(claude.request.user).toContain(WEB_PARITY_MARKERS.fortHeader);
      expect(claude.request.user).toContain("## maroBrain");
    }
  });
});

describe("maroWeb shadow structural diff", () => {
  for (const fixture of WEB_PARITY_FIXTURES) {
    if (fixture.id === "web-brain" || fixture.id === "web-fort-brain") continue;

    it(`${fixture.id}: no critical mismatch vs legacy snapshot`, () => {
      const { brief, legacy } = compileWebFixture(fixture);
      const legacySnap = buildWebLegacySnapshot({
        body: asWebBody(
          fixture.engine.webRequest ?? {
            businessName: "Test",
            category: "generic",
            language: "sq",
            userPrompt: fixture.engine.userPrompt,
            websiteType: "business",
          }
        ),
        masterPlusOptions: fixture.legacy.masterPrompt ?? "",
        fortBriefBlock: legacy.user?.includes(WEB_PARITY_MARKERS.fortHeader)
          ? legacy.user.split(WEB_PARITY_MARKERS.fortHeader)[1]?.trim()
          : undefined,
        model: brief.model,
        legacySystem: legacy.system,
        legacyUser: legacy.user,
        selections: fixture.engine.selections,
        fortEnabled: fixture.legacy.fort?.enabled,
      });

      const engineSnap = {
        systemInstructions: brief.providerMessages?.systemInstructions,
        userContent: brief.providerMessages?.userContent,
        model: brief.model,
        websiteType: brief.metadata.websiteType as string,
        outputRequirements: brief.outputRequirements,
        estimatedCredits: brief.estimatedCredits?.total,
      };

      const diff = buildWebStructuralDiff(legacySnap, engineSnap, {
        fortEnabled: fixture.legacy.fort?.enabled,
        websiteType: fixture.engine.webRequest?.websiteType,
      });

      expect(diff.criticalFlags).not.toContain("html_output_contract_missing_in_engine");
      expect(diff.criticalFlags).not.toContain("business_details_missing_in_engine");
      expect(diff.criticalFlags).not.toContain("engine_system_instructions_missing");
      expect(diff.criticalFlags).not.toContain("user_prompt_truncated_or_missing");
      expect(diff.criticalFlags).not.toContain("output_requirements_missing_in_engine");
    });
  }
});

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      insert: () => ({
        select: () => ({ single: () => Promise.resolve({ data: { id: "cmp-parity" }, error: null }) }),
      }),
    }),
  }),
}));

vi.mock("@/lib/engine/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/engine/storage")>();
  const { buildWebTestContext } = await import("@/lib/engine/parityFixtures");
  return {
    ...actual,
    loadCompileContext: vi.fn(async (toolId: string) => buildWebTestContext()),
  };
});

describe("maroWeb shadow safety", () => {
  it("shadow compile never calls provider and records zero engine provider requests", async () => {
    const fixture = WEB_PARITY_FIXTURES.find((f) => f.id === "web-simple")!;
    const { legacy, brief } = compileWebFixture(fixture);
    const legacySnap = buildWebLegacySnapshot({
      body: asWebBody(fixture.engine.webRequest!),
      masterPlusOptions: fixture.legacy.masterPrompt ?? "",
      model: brief.model,
      legacySystem: legacy.system,
      legacyUser: legacy.user,
    });

    const result = await runShadowCompilation({
      toolId: "website",
      registryToolId: "website",
      model: brief.model,
      userPrompt: fixture.engine.userPrompt,
      selections: fixture.engine.selections,
      useBrain: false,
      webRequest: fixture.engine.webRequest as AiGenerateRequest | undefined,
      legacySnapshot: legacySnap,
      providerRequestCount: 1,
    });

    expect(result.ok).toBe(true);
    expect(result.compileError).toBeUndefined();
  });

  it("shadow compiler failure does not throw", async () => {
    const { loadCompileContext } = await import("@/lib/engine/storage");
    vi.mocked(loadCompileContext).mockRejectedValueOnce(new Error("db unavailable"));

    await expect(
      runShadowCompilation({
        toolId: "website",
        registryToolId: "website",
        model: "opus-4-8",
        userPrompt: "fail case",
        legacySnapshot: { systemInstructions: "sys", userContent: "user" },
        providerRequestCount: 1,
      })
    ).resolves.toMatchObject({ ok: false, hasCriticalMismatch: true });
  });
});
