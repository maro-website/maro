import { describe, expect, it } from "vitest";
import {
  buildHtmlGenerateSystem,
  buildHtmlGenerateUser,
  buildWebHtmlOutputContract,
  CLIENT_BRAND_ISOLATION_INVARIANT,
} from "@/lib/ai/prompts";
import type { AiGenerateRequest } from "@/lib/ai/types";
import {
  MARO_UI_BRAND_COLOR,
  resolveWebBrandColor,
  resolveWebBrandColorFromRequest,
} from "@/lib/ai/webBrandColor";
import { WEB_LANGUAGE_AUTO } from "@/lib/ai/webLanguage";
import { mapWebBriefToClaude } from "@/lib/engine/adapters/claudeWeb";
import { compileGenerationBrief } from "@/lib/engine/compiler";
import { legacyComposePrompt } from "@/lib/engine/legacyCompose";
import { buildWebTestContext } from "@/lib/engine/parityFixtures";
import { createProjectFromComposer } from "@/lib/services/projectService";

const NOMA_PROMPT =
  "Create a clean one-page landing page for a fictional specialty coffee shop called Noma Coffee. Include hero, short about section, featured drinks, location/hours and contact CTA. Use a premium minimal editorial style, strong typography and a warm neutral visual direction. Content in English.";

function webBody(
  userPrompt: string,
  overrides: Partial<AiGenerateRequest> = {}
): AiGenerateRequest {
  return {
    businessName: overrides.businessName ?? "Noma Coffee",
    category: "generic",
    language: overrides.language ?? WEB_LANGUAGE_AUTO,
    goal: userPrompt,
    userPrompt,
    ...overrides,
  };
}

function compileEngine(userPrompt: string, overrides: Partial<AiGenerateRequest> = {}) {
  const body = webBody(userPrompt, overrides);
  const ctx = buildWebTestContext();
  const brief = compileGenerationBrief(
    {
      toolId: "maro_web",
      userId: "test-user",
      model: "opus-4-8",
      userPrompt,
      webRequest: body,
    },
    ctx
  );
  const claude = mapWebBriefToClaude(brief);
  return { brief, claude, body };
}

function legacyPrompts(body: AiGenerateRequest) {
  const legacy = legacyComposePrompt({
    toolId: "maro_web",
    userPrompt: body.userPrompt ?? body.goal,
    selections: { type: "landing", model: "opus-4-8", speed: "normal" },
    toolPrompts: {},
    webBody: body,
  });
  return { system: legacy.system ?? "", user: legacy.user ?? "" };
}

function assertNoMaroBrandLeak(text: string) {
  expect(text).not.toContain(MARO_UI_BRAND_COLOR);
  expect(text).not.toMatch(/Brand color:\s*#253FDA/i);
}

describe("resolveWebBrandColor", () => {
  it("returns no directive when color absent", () => {
    expect(resolveWebBrandColor({}).injectDirective).toBe(false);
  });

  it("accepts explicit user hex", () => {
    const r = resolveWebBrandColor({ userColor: "#FF5500" });
    expect(r.injectDirective).toBe(true);
    expect(r.color).toBe("#FF5500");
    expect(r.source).toBe("user");
  });

  it("documents client brand isolation invariant", () => {
    expect(CLIENT_BRAND_ISOLATION_INVARIANT).toMatch(/Maro product UI colors/i);
  });
});

describe("maroWeb client brand isolation", () => {
  it("A: no color supplied — #253FDA absent from provider prompt", () => {
    const prompt = "Noma Coffee. Warm neutral visual direction.";
    const { claude } = compileEngine(prompt);
    expect(claude.ok).toBe(true);
    if (!claude.ok || !claude.request) return;
    assertNoMaroBrandLeak(`${claude.request.system}\n${claude.request.user}`);
    expect(claude.request.user).not.toMatch(/Brand color:/i);
    expect(claude.request.system).toMatch(/Choose a coherent palette/i);
  });

  it("B: explicit user color #FF5500 preserved", () => {
    const { claude } = compileEngine("Coffee shop site.", { primaryColor: "#FF5500" });
    expect(claude.ok).toBe(true);
    if (!claude.ok || !claude.request) return;
    expect(claude.request.user).toContain("Brand color: #FF5500");
    expect(claude.request.system).toMatch(/Keep the primary brand color close to #FF5500/i);
  });

  it("C: composer UI theme may use Maro blue but generation omits it", () => {
    const project = createProjectFromComposer({
      prompt: NOMA_PROMPT,
      websiteType: "landing",
      speed: "fast",
    });
    expect(project.theme.primaryColor).toBe(MARO_UI_BRAND_COLOR);
    expect(project.explicitBrandColor).toBeUndefined();

    const reqShape = {
      businessName: project.businessName,
      goal: project.goal,
      category: project.category,
      language: project.language,
      userPrompt: project.prompt,
      ...(project.explicitBrandColor ? { primaryColor: project.explicitBrandColor } : {}),
    } satisfies Partial<AiGenerateRequest>;

    expect(reqShape).not.toHaveProperty("primaryColor");
    const { claude } = compileEngine(NOMA_PROMPT, reqShape as AiGenerateRequest);
    expect(claude.ok).toBe(true);
    if (!claude.ok || !claude.request) return;
    assertNoMaroBrandLeak(`${claude.request.system}\n${claude.request.user}`);
  });

  it("D: legacy path — no explicit client color", () => {
    const body = webBody(NOMA_PROMPT);
    const legacy = legacyPrompts(body);
    assertNoMaroBrandLeak(`${legacy.system}\n${legacy.user}`);
    expect(legacy.user).not.toMatch(/Brand color:/i);
  });

  it("E: Engine path — no explicit client color", () => {
    const { claude } = compileEngine(NOMA_PROMPT);
    expect(claude.ok).toBe(true);
    if (!claude.ok || !claude.request) return;
    assertNoMaroBrandLeak(`${claude.request.system}\n${claude.request.user}`);
  });

  it("F: Noma Coffee regression — English + locale + no brand leak", () => {
    const project = createProjectFromComposer({
      prompt: NOMA_PROMPT,
      websiteType: "landing",
      speed: "fast",
    });
    const body = webBody(NOMA_PROMPT, {
      businessName: project.businessName,
      language: project.language,
    });
    const { brief, claude } = compileEngine(NOMA_PROMPT, body);
    expect(claude.ok).toBe(true);
    if (!claude.ok || !claude.request) return;

    const combined = `${claude.request.system}\n${claude.request.user}\n${brief.outputRequirements ?? ""}`;
    assertNoMaroBrandLeak(combined);
    expect(combined).toMatch(/must be in English/i);
    expect(combined).toMatch(/Language and geography are independent/i);
    expect(combined).not.toMatch(/Brand color:/i);

    const legacy = legacyPrompts(body);
    assertNoMaroBrandLeak(`${legacy.system}\n${legacy.user}`);
  });
});

describe("buildWebHtmlOutputContract brand rules", () => {
  it("omits hex-binding rule without explicit color", () => {
    const contract = buildWebHtmlOutputContract({ websiteType: "landing" });
    assertNoMaroBrandLeak(contract);
    expect(contract).toMatch(/Choose a coherent palette/i);
    expect(contract).not.toMatch(/close to #/i);
  });

  it("binds palette rule when explicit color provided", () => {
    const contract = buildWebHtmlOutputContract({
      websiteType: "landing",
      primaryColor: "#FF5500",
    });
    expect(contract).toMatch(/close to #FF5500/i);
  });
});

describe("legacy HTML user builder", () => {
  it("buildHtmlGenerateUser omits brand line without color", () => {
    const user = buildHtmlGenerateUser(
      webBody("Site brief.", { primaryColor: undefined })
    );
    expect(user).not.toMatch(/Brand color:/i);
    assertNoMaroBrandLeak(user);
  });

  it("buildHtmlGenerateSystem omits Maro hex without color", () => {
    const system = buildHtmlGenerateSystem(webBody("Site brief."), "");
    assertNoMaroBrandLeak(system);
  });
});

// generationService passes explicitBrandColor only — shape verified via project field
describe("generation request shape", () => {
  it("project without explicitBrandColor does not resolve a brand directive", () => {
    const project = createProjectFromComposer({
      prompt: "Test",
      websiteType: "landing",
      speed: "fast",
    });
    expect(resolveWebBrandColorFromRequest({ primaryColor: project.explicitBrandColor }).injectDirective).toBe(
      false
    );
  });
});
