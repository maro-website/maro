"use client";

import { Field, Textarea } from "@/components/ui/Input";
import { WizardStepLayout } from "../ui/WizardStepLayout";
import { TraitPills } from "../ui/TraitPills";
import { DiscreteSlider } from "../ui/DiscreteSlider";
import { DIRECTION_SLIDER_LABELS } from "@/lib/marologo/constants";
import type { DirectionSliders, MaroLogoWizardState, WizardStep } from "@/lib/marologo/types";

export function StepDirection({
  step,
  highestStepReached,
  wizard,
  errors,
  onChangeTraits,
  onChangeSliders,
  onChangeAudience,
  onMaxTraits,
  onNext,
  onStepClick,
}: {
  step: WizardStep;
  highestStepReached: WizardStep;
  wizard: MaroLogoWizardState;
  errors: Record<string, string>;
  onChangeTraits: (traits: string[]) => void;
  onChangeSliders: (sliders: Partial<DirectionSliders>) => void;
  onChangeAudience: (audience: string) => void;
  onMaxTraits: () => void;
  onNext: () => void;
  onStepClick?: (step: WizardStep) => void;
}) {
  return (
    <WizardStepLayout
      step={step}
      highestStepReached={highestStepReached}
      title="02 - Drejtimi"
      nextLabel="Vazhdo - Hapi 3: Logo"
      nextDisabled={Object.keys(errors).length > 0}
      onNext={onNext}
      onStepClick={onStepClick}
    >
      <div>
        <span className="marologo-field-label mb-3 block">
          Qysh duhet me u ndi brendi? Zgjedh deri në 5 *
        </span>
        <TraitPills value={wizard.direction.traits} onChange={onChangeTraits} onMaxReached={onMaxTraits} />
        {errors.traits && <p className="mt-2 text-[12px] text-danger">{errors.traits}</p>}
      </div>

      <div>
        <span className="marologo-field-label mb-3 block">Brendi duhet me u ndi më shumë: *</span>
        <div className="space-y-3">
          {DIRECTION_SLIDER_LABELS.map((s) => (
            <DiscreteSlider
              key={s.key}
              left={s.left}
              right={s.right}
              value={wizard.direction.sliders[s.key]}
              onChange={(v) => onChangeSliders({ [s.key]: v })}
            />
          ))}
        </div>
      </div>

      <Field label="Për kë është ky brend?" hint={errors.audience}>
        <Textarea
          value={wizard.direction.audience}
          onChange={(e) => onChangeAudience(e.target.value)}
          rows={3}
          placeholder="P.sh. Biznese të vogla dhe startup-e që duan branding modern"
          className="marologo-card min-h-[100px] border-0 bg-surface"
        />
      </Field>
    </WizardStepLayout>
  );
}
