"use client";

import { cn } from "@/lib/utils/cn";
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
    <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={5}>
      {([1, 2, 3, 4, 5] as WizardStep[]).map((step) => {
        const completed = step < currentStep;
        const active = step === currentStep;
        const reachable = step <= highestStepReached;
        const filled = completed || active;

        return (
          <button
            key={step}
            type="button"
            disabled={!reachable || !onStepClick}
            onClick={() => reachable && onStepClick?.(step)}
            aria-label={`Hapi ${step}`}
            aria-current={active ? "step" : undefined}
            className={cn(
              "h-1.5 min-h-[6px] flex-1 rounded-full transition-colors",
              filled ? "bg-brand" : "bg-line-strong",
              reachable && onStepClick && "cursor-pointer hover:opacity-80",
              !reachable && "cursor-default"
            )}
          />
        );
      })}
    </div>
  );
}
