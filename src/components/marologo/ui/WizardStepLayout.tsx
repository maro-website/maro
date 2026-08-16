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
        <MaroLogoProgress
          currentStep={step}
          highestStepReached={highestStepReached}
          onStepClick={onStepClick}
        />
      </div>

      <h1 className="marologo-step-title mb-8">{title}</h1>

      <div className="space-y-6">{children}</div>

      <div className="mt-10">
        {nextExtra ?? (
          <Button
            type="button"
            className="h-12 w-full rounded-2xl text-[15px] font-semibold"
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
