"use client";

import type { WizardStep } from "@/lib/marologo/types";

export function MaroLogoProgress({
  currentStep,
  highestStepReached,
  onStepClick,
}: {
  currentStep: WizardStep;
  highestStepReached: WizardStep;
  onStepClick?: (step: WizardStep) => void;
}) {
  return (
    <div className="maro-progress-steps" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={5}>
      {([1, 2, 3, 4, 5] as WizardStep[]).map((step) => {
        const active = step === currentStep;
        const reachable = step <= highestStepReached;

        return (
          <button
            key={step}
            type="button"
            disabled={!reachable || !onStepClick}
            onClick={() => reachable && onStepClick?.(step)}
            aria-label={`Hapi ${step}`}
            aria-current={active ? "step" : undefined}
            className="maro-progress-steps__seg disabled:cursor-default"
            data-active={active || step < currentStep || undefined}
          />
        );
      })}
    </div>
  );
}
