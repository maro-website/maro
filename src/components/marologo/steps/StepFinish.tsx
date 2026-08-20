"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MaroIcon } from "@/components/app/OptionIcon";
import { WizardStepLayout } from "../ui/WizardStepLayout";
import { MiniReview } from "../ui/MiniReview";
import { CreativeFreedomCards } from "../ui/CreativeFreedomCards";
import type { CreativeFreedom, MaroLogoWizardState, WizardStep } from "@/lib/marologo/types";

export function StepFinish({
  step,
  highestStepReached,
  wizard,
  errors,
  cost,
  generating,
  onChangeFinish,
  onGenerate,
  onStepClick,
}: {
  step: WizardStep;
  highestStepReached: WizardStep;
  wizard: MaroLogoWizardState;
  errors: Record<string, string>;
  cost: number;
  generating: boolean;
  onChangeFinish: (patch: Partial<MaroLogoWizardState["finish"]>) => void;
  onGenerate: () => void;
  onStepClick?: (step: WizardStep) => void;
}) {
  const canGenerate = wizard.finish.confirmed && Object.keys(errors).length === 0 && !generating;

  return (
    <WizardStepLayout
      step={step}
      highestStepReached={highestStepReached}
      title="05 - Finish Look"
      nextLabel=""
      onNext={() => {}}
      onStepClick={onStepClick}
      nextExtra={
        <div className="space-y-[30px]">
          <button
            type="button"
            role="checkbox"
            aria-checked={wizard.finish.confirmed}
            onClick={() => onChangeFinish({ confirmed: !wizard.finish.confirmed })}
            className="flex w-full items-start gap-[20px] text-left"
          >
            <span
              className="marologo-checkbox mt-0.5"
              data-checked={wizard.finish.confirmed || undefined}
            >
              {wizard.finish.confirmed && <Check className="h-4 w-4" strokeWidth={3} />}
            </span>
            <span className="text-[14px] leading-relaxed text-ink">
              Pranoj qe i kom plotesu te gjitha dhe jam i gatshem te shoh gjenerimin e logos
            </span>
          </button>
          {errors.confirmed && <p className="text-[12px] text-danger">{errors.confirmed}</p>}

          <Button
            type="button"
            className="h-12 w-full rounded-2xl text-[15px] font-semibold"
            disabled={!canGenerate}
            onClick={onGenerate}
          >
            <span className="inline-flex items-center gap-[10px]">
              maro-je Logon
              <MaroIcon name="coins" className="h-4 w-4" />
              {cost}
            </span>
          </Button>
        </div>
      }
    >
      <MiniReview wizard={wizard} />

      <div>
        <span className="marologo-field-label mb-[10px] block">Creative Freedom:</span>
        <CreativeFreedomCards
          value={wizard.finish.creativeFreedom}
          onChange={(creativeFreedom: CreativeFreedom) => onChangeFinish({ creativeFreedom })}
        />
      </div>
    </WizardStepLayout>
  );
}
