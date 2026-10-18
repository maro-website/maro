import { describe, expect, it } from "vitest";
import { DEFAULT_LOGO_CONTENT } from "@/lib/marologo/content";
import { DEFAULT_WIZARD_STATE } from "@/lib/marologo/defaults";
import { validateLogoStep } from "@/lib/marologo/validation";

describe("maroLogo step validation", () => {
  it("recovers after submitting a name without a description", () => {
    const wizard = structuredClone(DEFAULT_WIZARD_STATE);
    wizard.brand.name = "Luma";
    expect(validateLogoStep(1, wizard, DEFAULT_LOGO_CONTENT).errors).toHaveProperty("description");
    wizard.brand.description = "Studio kreative për biznese të vogla.";
    expect(validateLogoStep(1, wizard, DEFAULT_LOGO_CONTENT)).toEqual({ valid: true, errors: {} });
    wizard.brand.description = "   ";
    expect(validateLogoStep(1, wizard, DEFAULT_LOGO_CONTENT).valid).toBe(false);
    wizard.brand.description = "Studio kreative.";
    expect(validateLogoStep(1, wizard, DEFAULT_LOGO_CONTENT).valid).toBe(true);
  });

  it("keeps configurable required answers on their own step", () => {
    const wizard = structuredClone(DEFAULT_WIZARD_STATE);
    wizard.brand.name = "Luma";
    wizard.brand.description = "Studio kreative.";
    const content = structuredClone(DEFAULT_LOGO_CONTENT);
    content["brand.audience"].required = true;
    content["logo.symbolMeaning"].required = true;
    expect(Object.keys(validateLogoStep(1, wizard, content).errors)).toEqual(["audience"]);
    expect(Object.keys(validateLogoStep(2, wizard, content).errors)).toEqual(["symbolMeaning"]);
    expect(validateLogoStep(3, wizard, content).valid).toBe(true);
    wizard.brand.audience = "Biznese të vogla";
    expect(validateLogoStep(1, wizard, content).valid).toBe(true);
    expect(validateLogoStep(2, wizard, content).valid).toBe(false);
    wizard.logo.symbolMeaning = "Lidhje dhe bashkëpunim";
    expect(validateLogoStep(2, wizard, content).valid).toBe(true);
  });

  it("recovers from custom colors without carrying brand errors into direction", () => {
    const wizard = structuredClone(DEFAULT_WIZARD_STATE);
    wizard.look.colors = { mode: "custom", values: [] };
    expect(validateLogoStep(2, wizard, DEFAULT_LOGO_CONTENT).errors).toEqual({ colors: "Shto të paktën një ngjyrë." });
    wizard.look.colors.values = ["#253FDA"];
    expect(validateLogoStep(2, wizard, DEFAULT_LOGO_CONTENT).valid).toBe(true);
    expect(validateLogoStep(1, wizard, DEFAULT_LOGO_CONTENT).valid).toBe(false);
  });

  it("finds an edited earlier step before allowing generation", () => {
    const wizard = structuredClone(DEFAULT_WIZARD_STATE);
    wizard.brand.name = "Luma";
    wizard.brand.description = "Studio kreative.";
    const firstInvalidStep = () => ([1, 2, 3] as const).find(step => !validateLogoStep(step, wizard, DEFAULT_LOGO_CONTENT).valid);
    expect(firstInvalidStep()).toBeUndefined();
    wizard.brand.description = "";
    expect(firstInvalidStep()).toBe(1);
    wizard.brand.description = "Studio kreative.";
    wizard.look.colors = { mode: "custom", values: ["invalid"] };
    expect(firstInvalidStep()).toBe(2);
  });
});
