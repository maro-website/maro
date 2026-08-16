"use client";

import { Field, Input, Textarea } from "@/components/ui/Input";
import { WizardStepLayout } from "../ui/WizardStepLayout";
import { SearchableSelect } from "../ui/SearchableSelect";
import { UsageMultiSelect } from "../ui/UsageMultiSelect";
import { INDUSTRIES, INDUSTRY_OTHER } from "@/lib/marologo/constants";
import type { MaroLogoWizardState, WizardStep } from "@/lib/marologo/types";

export function StepBrand({
  step,
  highestStepReached,
  wizard,
  errors,
  onChange,
  onNext,
  onStepClick,
}: {
  step: WizardStep;
  highestStepReached: WizardStep;
  wizard: MaroLogoWizardState;
  errors: Record<string, string>;
  onChange: (patch: Partial<MaroLogoWizardState["brand"]>) => void;
  onNext: () => void;
  onStepClick?: (step: WizardStep) => void;
}) {
  return (
    <WizardStepLayout
      step={step}
      highestStepReached={highestStepReached}
      title="01 - Brendi"
      nextLabel="Vazhdo - Hapi 2: Drejtimi"
      nextDisabled={Object.keys(errors).length > 0}
      onNext={onNext}
      onStepClick={onStepClick}
    >
      <Field label="Emri i brendit *" hint={errors.name}>
        <Input
          value={wizard.brand.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="NICE"
          className="marologo-card h-12 border-0 bg-surface"
        />
      </Field>

      <Field label="A ka slogan?" hint={errors.slogan}>
        <Input
          value={wizard.brand.slogan}
          onChange={(e) => onChange({ slogan: e.target.value })}
          placeholder="Opcionale"
          className="marologo-card h-12 border-0 bg-surface"
        />
      </Field>

      <Field label="Çka bon brendi? *" hint={errors.description}>
        <Textarea
          value={wizard.brand.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={4}
          placeholder="Agjension kreativ që merret me branding, web, video dhe marketing."
          className="marologo-card min-h-[120px] border-0 bg-surface"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SearchableSelect
          label="Industria *"
          options={INDUSTRIES}
          value={wizard.brand.industry}
          onChange={(v) => onChange({ industry: v })}
          otherTrigger={INDUSTRY_OTHER}
          otherValue={wizard.brand.industryOther}
          onOtherChange={(v) => onChange({ industryOther: v })}
          otherLabel="Shkruaj industrinë"
          error={errors.industry || errors.industryOther}
        />
        <UsageMultiSelect
          value={wizard.brand.usage}
          onChange={(usage) => onChange({ usage })}
          error={errors.usage}
        />
      </div>
    </WizardStepLayout>
  );
}
