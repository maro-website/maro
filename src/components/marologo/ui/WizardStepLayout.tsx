"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { MaroLogoProgress } from "./MaroLogoProgress";
import type { WizardStep } from "@/lib/marologo/types";

export function WizardStepLayout({
  step,
  highestStepReached,
  title,
  children,
  nextLabel,
  nextDisabled,
  onNext,
  onStepClick,
  nextExtra,
}: {
  step: WizardStep;
  highestStepReached: WizardStep;
  title: string;
  children: React.ReactNode;
  nextLabel: string;
  nextDisabled?: boolean;
  onNext: () => void;
  onStepClick?: (step: WizardStep) => void;
  nextExtra?: React.ReactNode;
}) {
  return (
    <div className="marologo-shell">
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between text-[12px] font-semibold text-ink-3">
          <span>maroLogo</span>
          <span>Hapi {step} prej 5</span>
        </div>
        <MaroLogoProgress
          currentStep={step}
          highestStepReached={highestStepReached}
          onStepClick={onStepClick}
        />
      </div>

      <h1 className="marologo-step-title mb-10">{title}</h1>

      <div className="space-y-[30px]">{children}</div>

      <div className="mt-10">
        {nextExtra ?? (
          <Button
            type="button"
            className="h-[52px] w-full rounded-maro16 text-[15px] font-semibold"
            onClick={onNext}
            disabled={nextDisabled}
          >
            {nextLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
