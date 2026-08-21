import { INDUSTRY_OTHER } from "./constants";
import type { MaroLogoWizardState, WizardStep } from "./types";

export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(raw)) return null;
  if (raw.length === 3) {
    const expanded = raw.split("").map((c) => c + c).join("");
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
  if (!desc) errors.description = "Trego shkurt çka bën brendi.";
  else if (desc.length > 700) errors.description = "Përshkrimi duhet të jetë më i shkurtër se 700 karaktere.";
  if (w.brand.industry === INDUSTRY_OTHER && !w.brand.industryOther.trim()) errors.industryOther = "Shkruaj industrinë.";
  if (w.brand.audience.trim().length > 500) errors.audience = "Teksti duhet të jetë më i shkurtër se 500 karaktere.";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateStep2(w: MaroLogoWizardState): StepValidation {
  const errors: Record<string, string> = {};
  if (w.direction.traits.length > 3) errors.traits = "Zgjedh maksimum 3 tipare.";
  if (!w.logo.type) errors.type = "Zgjidh llojin e logos.";
  if (!w.logo.conceptIntent) errors.conceptIntent = "Zgjidh prioritetin e konceptit.";
  if (!w.look.visualStyle) errors.visualStyle = "Zgjidh drejtimin vizual.";
  if (w.look.colors.mode === "custom") {
    if (w.look.colors.values.length === 0) errors.colors = "Shto të paktën një ngjyrë.";
    else if (w.look.colors.values.some((c) => !normalizeHex(c))) errors.colors = "Ka ngjyra me format të pavlefshëm.";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateStep3(w: MaroLogoWizardState): StepValidation {
  const errors: Record<string, string> = {};
  if (!w.presentation.mode) errors.presentation = "Zgjidh mënyrën e prezantimit.";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateStep(step: WizardStep, w: MaroLogoWizardState): StepValidation {
  if (step === 1) return validateStep1(w);
  if (step === 2) return validateStep2(w);
  return validateStep3(w);
}

export function resolveIndustry(w: MaroLogoWizardState): string {
  if (w.brand.industry === INDUSTRY_OTHER) return w.brand.industryOther.trim() || "Not specified";
  return w.brand.industry || "Infer from the business description";
}
