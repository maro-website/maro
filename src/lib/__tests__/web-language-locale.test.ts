import { describe, expect, it } from "vitest";
import {
  buildHtmlGenerateSystem,
  buildHtmlGenerateUser,
  buildWebHtmlOutputContract,
} from "@/lib/ai/prompts";
import type { AiGenerateRequest } from "@/lib/ai/types";
import {
  WEB_LANGUAGE_AUTO,
  WEB_LOCALE_NEUTRALITY_POLICY,
  detectPromptLanguageInstruction,
  resolveWebContentLanguage,
} from "@/lib/ai/webLanguage";
import { mapWebBriefToClaude } from "@/lib/engine/adapters/claudeWeb";
import { compileGenerationBrief } from "@/lib/engine/compiler";
import { buildWebTestContext } from "@/lib/engine/parityFixtures";
import { createProjectFromComposer } from "@/lib/services/projectService";

const NOMA_PROMPT =
  "Create a clean one-page landing page for a fictional specialty coffee shop called Noma Coffee. Include hero, short about section, featured drinks, location/hours and contact CTA. Use a premium minimal editorial style, strong typography and a warm neutral visual direction. Content in English.";

function webRequest(
  userPrompt: string,
  overrides: Partial<AiGenerateRequest> = {}
): AiGenerateRequest {
  return {
    businessName: overrides.businessName ?? "Noma Coffee",
    category: "generic",
    language: overrides.language ?? WEB_LANGUAGE_AUTO,
    goal: userPrompt,
    userPrompt,
    websiteType: "landing",
    ...overrides,
  };
}

function compileEngine(userPrompt: string, overrides: Partial<AiGenerateRequest> = {}) {
  const body = webRequest(userPrompt, overrides);
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
  return {
    system: buildHtmlGenerateSystem(body, ""),
    user: buildHtmlGenerateUser(body),
  };
}

function assertNoAlbanianDirective(text: string) {
  expect(text).not.toMatch(/must be in Albanian/i);
  expect(text).not.toMatch(/Content language: Albanian/i);
}

function assertEnglishDirective(text: string) {
  expect(text).toMatch(/must be in English/i);
}

function assertLocalePolicy(text: string) {
  expect(text).toContain(WEB_LOCALE_NEUTRALITY_POLICY);
  expect(text).toMatch(/Language and geography are independent/i);
}

describe("resolveWebContentLanguage", () => {
  it("prefers explicit structured language over prompt text", () => {
    const r = resolveWebContentLanguage({
      structuredLanguage: "sq",
      userPrompt: "Content in English.",
    });
    expect(r.source).toBe("structured");
    expect(r.code).toBe("sq");
    expect(r.injectDirective).toBe(true);
  });

  it("detects English from prompt when structured language is auto", () => {
    const r = resolveWebContentLanguage({
      structuredLanguage: WEB_LANGUAGE_AUTO,
      userPrompt: "Coffee shop. Content in English.",
    });
    expect(r.source).toBe("prompt");
    expect(r.code).toBe("en");
  });

  it("returns auto when nothing explicit is provided", () => {
    const r = resolveWebContentLanguage({
      structuredLanguage: WEB_LANGUAGE_AUTO,
      userPrompt: "Krijo një faqe për kafene.",
    });
    expect(r.source).toBe("auto");
    expect(r.injectDirective).toBe(false);
  });
});

describe("maroWeb language / locale fidelity", () => {
  it("A: explicit English in prompt with auto structured language — no Albanian directive", () => {
    const prompt = "Create a coffee shop site. Content in English.";
    const { brief, claude } = compileEngine(prompt);
    expect(claude.ok).toBe(true);
    if (!claude.ok || !claude.request) return;

    assertNoAlbanianDirective(claude.request.system);
    assertNoAlbanianDirective(claude.request.user);
    assertEnglishDirective(claude.request.system);
    expect(claude.request.user).toContain("Content in English");
    assertLocalePolicy(claude.request.system);
    expect(brief.outputRequirements).toContain("Language and geography are independent");

    const legacy = legacyPrompts(webRequest(prompt));
    assertNoAlbanianDirective(legacy.system);
    assertNoAlbanianDirective(legacy.user);
    assertEnglishDirective(legacy.system);
  });

  it("B: explicit German in prompt — no Albanian directive", () => {
    const prompt = "Create a bakery website. Write in German.";
    const { claude } = compileEngine(prompt);
    expect(claude.ok).toBe(true);
    if (!claude.ok || !claude.request) return;

    assertNoAlbanianDirective(claude.request.system);
    expect(claude.request.system).toMatch(/must be in German/i);
    assertLocalePolicy(claude.request.system);
  });

  it("C: Albanian prompt without locale — no forced geography in contract", () => {
    const prompt = "Krijo një faqe të pastër për një kafene të specializuar.";
    const contract = buildWebHtmlOutputContract({
      websiteType: "landing",
      language: WEB_LANGUAGE_AUTO,
      userPrompt: prompt,
    });
    assertNoAlbanianDirective(contract);
    assertLocalePolicy(contract);
    expect(contract).not.toMatch(/\bTirana\b|\bPrishtina\b|\bLek\b|\+383|\+355/i);

    const { claude } = compileEngine(prompt);
    expect(claude.ok).toBe(true);
    if (!claude.ok || !claude.request) return;
    assertNoAlbanianDirective(claude.request.system);
    assertLocalePolicy(claude.request.system);
  });

  it("D: explicit structured Albanian allows Albanian directive", () => {
    const prompt = "Coffee shop landing page.";
    const { claude } = compileEngine(prompt, { language: "sq" });
    expect(claude.ok).toBe(true);
    if (!claude.ok || !claude.request) return;
    expect(claude.request.system).toMatch(/must be in Albanian/i);
    expect(claude.request.user).toMatch(/Content language: Albanian/i);
  });

  it("D: explicit structured English allows English directive", () => {
    const prompt = "Krijo faqe kafene.";
    const { claude } = compileEngine(prompt, { language: "en" });
    expect(claude.ok).toBe(true);
    if (!claude.ok || !claude.request) return;
    expect(claude.request.system).toMatch(/must be in English/i);
    expect(claude.request.user).toMatch(/Content language: English/i);
  });

  it("E: explicit Tirana + Lek in user prompt is preserved", () => {
    const prompt = "Coffee shop in Tirana, prices in Lek. Content in English.";
    const { claude } = compileEngine(prompt);
    expect(claude.ok).toBe(true);
    if (!claude.ok || !claude.request) return;
    expect(claude.request.user).toContain("Tirana");
    expect(claude.request.user).toContain("Lek");
    assertLocalePolicy(claude.request.system);
    assertEnglishDirective(claude.request.system);
  });

  it("F: explicit Prishtina + EUR in user prompt is preserved", () => {
    const prompt = "Restaurant in Prishtina, prices in EUR. Content in English.";
    const { claude } = compileEngine(prompt);
    expect(claude.ok).toBe(true);
    if (!claude.ok || !claude.request) return;
    expect(claude.request.user).toContain("Prishtina");
    expect(claude.request.user).toContain("EUR");
    assertEnglishDirective(claude.request.system);
  });

  it("G: Noma Coffee regression — English not contradicted anywhere", () => {
    const project = createProjectFromComposer({
      prompt: NOMA_PROMPT,
      websiteType: "landing",
      speed: "fast",
    });
    expect(project.language).toBe(WEB_LANGUAGE_AUTO);

    const body = webRequest(NOMA_PROMPT, {
      businessName: project.businessName,
      language: project.language,
    });
    const { brief, claude } = compileEngine(NOMA_PROMPT, body);
    expect(claude.ok).toBe(true);
    if (!claude.ok || !claude.request) return;

    const combined = `${claude.request.system}\n${claude.request.user}\n${brief.outputRequirements ?? ""}`;
    assertNoAlbanianDirective(combined);
    assertEnglishDirective(claude.request.system);
    expect(claude.request.user).toContain("Content in English.");
    expect(detectPromptLanguageInstruction(NOMA_PROMPT)).toBe("en");

    const legacy = legacyPrompts(body);
    assertNoAlbanianDirective(`${legacy.system}\n${legacy.user}`);
    assertEnglishDirective(legacy.system);
  });
});

describe("createProjectFromComposer", () => {
  it("does not manufacture Albanian as user intent", () => {
    const p = createProjectFromComposer({
      prompt: "A simple site",
      websiteType: "landing",
      speed: "fast",
    });
    expect(p.language).toBe(WEB_LANGUAGE_AUTO);
  });
});
