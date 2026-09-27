import { describe, expect, it } from "vitest";
import { buildMaroLogoBrief } from "@/lib/marologo/briefBuilder";
import { DEFAULT_WIZARD_STATE } from "@/lib/marologo/defaults";
import { buildGenerationSelections } from "@/lib/marologo/generation";
import { reconcileLogoFortValues } from "@/lib/marologo/fortReconciliation";
import { composeToolPrompt, getTool } from "@/lib/tools/registry";
import type { MaroLogoWizardState, PresentationMode } from "@/lib/marologo/types";

const scenarios = [
  { name: "SaaS company", brand: "Relay", description: "SaaS platform that automates operations for small teams", industry: "Software / SaaS", marker: "advanced capability versus effortless simplicity" },
  { name: "premium restaurant", brand: "Atria", description: "A premium neighborhood restaurant centered on seasonal dining", industry: "Restaurant / Café", marker: "warmth versus premium restraint" },
  { name: "construction company", brand: "Forma", description: "Construction company for precise commercial builds", industry: "Construction", marker: "structural strength versus contemporary sophistication" },
  { name: "fashion label", brand: "Nera", description: "Independent fashion label with limited-run garments", industry: "Fashion", marker: "timeless elegance versus a distinctive contemporary edge" },
  { name: "creative agency", brand: "Offset", description: "Creative agency for brand strategy and campaigns", industry: "Creative Agency", marker: "expressive personality versus strategic clarity" },
  { name: "children's product", brand: "Mimo", description: "Educational building toys for young children", industry: "Kids & Family", marker: "playfulness versus clarity and trust" },
  { name: "fintech", brand: "Current", description: "Fintech service that simplifies business payments", industry: "Fintech", marker: "institutional credibility versus modern speed" },
  { name: "typographic personal brand", brand: "Arben K", description: "Personal brand for an independent strategy consultant", industry: "Personal Brand", marker: "individual character versus professional authority" },
] as const;

function stateFor(index: number, mode: PresentationMode): MaroLogoWizardState {
  const scenario = scenarios[index];
  const state = structuredClone(DEFAULT_WIZARD_STATE);
  state.brand.name = scenario.brand;
  state.brand.description = scenario.description;
  state.brand.industry = scenario.industry;
  state.presentation.mode = mode;
  return state;
}

describe("maroLogo identity compiler matrix", () => {
  for (const [index, scenario] of scenarios.entries()) {
    for (const mode of ["bw", "color", "mockup", "bento"] as const) {
      it(`${scenario.name} compiles a specific ${mode} brief`, () => {
        const brief = buildMaroLogoBrief(stateFor(index, mode), false);
        expect(brief).toContain(`Exact name: ${scenario.brand}`);
        expect(brief).toContain(scenario.marker);
        expect(brief).toContain("Category clichés:");
        expect(brief).not.toContain("DESIGN CONTROLS");
        expect(brief).not.toContain("raw JSON");

        if (mode === "bw") expect(brief).toContain("BLACK & WHITE:");
        if (mode === "color") expect(brief).toContain("COLOR:");
        if (mode === "mockup") expect(brief).toContain("LOGO MOCKUP:");
        if (mode === "bento") {
          expect(brief).toContain("BENTO GRID — RECOMMENDED IDENTITY-SYSTEM VIEW");
          expect(brief).toContain("SAME core symbol");
          expect(brief).toContain("not a sheet of alternatives");
        }
      });
    }
  }

  it("produces meaningfully different strategic briefs across categories", () => {
    const strategicBlocks = scenarios.map((_, index) => {
      const brief = buildMaroLogoBrief(stateFor(index, "bento"), false);
      return brief.slice(brief.indexOf("STRATEGIC IDEA"), brief.indexOf("DESIGN DIRECTION"));
    });
    expect(new Set(strategicBlocks).size).toBe(scenarios.length);
  });

  it("logs the selected presentation and intelligence inputs", () => {
    const state = stateFor(0, "bento");
    state.logo.conceptIntent = "meaning";
    state.look.visualStyle = "technical_precise";
    expect(buildGenerationSelections(state)).toMatchObject({ present: "bento", concept_intent: "meaning", visual_style: "technical_precise", type_source: "maro_decides" });
  });

  it("compiles the complete provider-facing bento prompt through the canonical tool composer", () => {
    const state = stateFor(1, "bento");
    const brief = buildMaroLogoBrief(state, false);
    const finalPrompt = composeToolPrompt(getTool("logo")!, buildGenerationSelections(state), {}, brief);
    expect(finalPrompt).toContain("expert identity designer");
    expect(finalPrompt).toContain("Presentation priority: BENTO GRID");
    expect(finalPrompt).toContain("same identity system, never unrelated concepts");
    expect(finalPrompt).toContain("premium menu cover");
    expect(finalPrompt.indexOf("Presentation priority: BENTO GRID")).toBeLessThan(finalPrompt.indexOf("PROFESSIONAL IDENTITY BRIEF"));
  });
});

describe("maroLogo Fort reconciliation", () => {
  it("removes duplicated stale brand fields and respects explicit Standard type", () => {
    const values = reconcileLogoFortValues(
      { type_source: "wordmark", present: "color" },
      { brandName: "Old name", industry: "tech", logoStyle: "emblem", distinctiveness: "80", mustInclude: "Old item" }
    );
    expect(values).toEqual({ distinctiveness: "80" });
  });

  it("forces monochrome presentation above conflicting Fort color values", () => {
    const values = reconcileLogoFortValues(
      { type_source: "maro_decides", present: "bw" },
      { logoStyle: "emblem", colorApproach: "vibrant", primaryColor: "#FF0000", background: "dark" }
    );
    expect(values).toEqual({ logoStyle: "emblem", colorApproach: "monochrome" });
  });
});
