import { INDUSTRY_OTHER } from "./constants";
import type { MaroLogoWizardState, WizardStep } from "./types";

export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(raw)) return null;
  if (raw.length === 3) {
    const expanded = raw
      .split("")
      .map((c) => c + c)
      .join("");
    return `#${expanded.toUpperCase()}`;
  }
  return `#${raw.toUpperCase()}`;
}

export interface StepValidation {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateStep1(w: MaroLogoWizardState): StepValidation {
  const errors: Record<string, string> = {};
  const name = w.brand.name.trim();
  if (!name) errors.name = "Emri i brendit është i detyrueshëm.";
  else if (name.length > 80) errors.name = "Emri duhet të jetë më i shkurtër se 80 karaktere.";

  if (w.brand.slogan.trim().length > 120) errors.slogan = "Slogani duhet të jetë më i shkurtër se 120 karaktere.";

  const desc = w.brand.description.trim();
  if (!desc) errors.description = "Përshkrimi i brendit është i detyrueshëm.";
  else if (desc.length > 700) errors.description = "Përshkrimi duhet të jetë më i shkurtër se 700 karaktere.";

  if (!w.brand.industry) errors.industry = "Zgjidh industrinë.";
  else if (w.brand.industry === INDUSTRY_OTHER && !w.brand.industryOther.trim()) {
    errors.industryOther = "Shkruaj industrinë.";
  }

  if (w.brand.usage.length === 0) errors.usage = "Zgjidh të paktën një përdorim.";

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateStep2(w: MaroLogoWizardState): StepValidation {
  const errors: Record<string, string> = {};
  if (w.direction.traits.length === 0) errors.traits = "Zgjidh të paktën një tipar.";
  if (w.direction.traits.length > 5) errors.traits = "Mundesh me zgjedh maksimum 5.";
  if (w.direction.audience.trim().length > 500) errors.audience = "Teksti duhet të jetë më i shkurtër se 500 karaktere.";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateStep3(w: MaroLogoWizardState): StepValidation {
  const errors: Record<string, string> = {};
  if (!w.logo.type) errors.type = "Zgjidh llojin e logos.";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateStep4(w: MaroLogoWizardState): StepValidation {
  const errors: Record<string, string> = {};
  if (!w.look.typography) errors.typography = "Zgjidh tipografinë.";
  if (w.look.colors.mode === "custom") {
    if (w.look.colors.values.length === 0) errors.colors = "Shto të paktën një ngjyrë.";
    else if (w.look.colors.values.some((c) => !normalizeHex(c))) {
      errors.colors = "Ka ngjyra me format të pavlefshëm.";
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateStep5(w: MaroLogoWizardState): StepValidation {
  const errors: Record<string, string> = {};
  if (!w.finish.creativeFreedom) errors.creativeFreedom = "Zgjidh llojin e lirisë kreative.";
  if (!w.finish.confirmed) errors.confirmed = "Konfirmo para gjenerimit.";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateStep(step: WizardStep, w: MaroLogoWizardState): StepValidation {
  switch (step) {
    case 1:
      return validateStep1(w);
    case 2:
      return validateStep2(w);
    case 3:
      return validateStep3(w);
    case 4:
      return validateStep4(w);
    case 5:
      return validateStep5(w);
    default:
      return { valid: true, errors: {} };
  }
}

export function resolveIndustry(w: MaroLogoWizardState): string {
  if (w.brand.industry === INDUSTRY_OTHER) return w.brand.industryOther.trim() || INDUSTRY_OTHER;
  return w.brand.industry;
}
