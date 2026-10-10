"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { ProductLogo } from "@/components/ui/ProductLogo";
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
        <div className="mb-5">
          <ProductLogo product="maroLogo" className="h-7 w-[100px]" />
        </div>
        <div className="rounded-maro16 bg-surface px-4 py-3">
        <div className="mb-3 flex items-center justify-between text-[12px] font-semibold text-ink-3"><span>Progresi yt</span><span className="text-ink">Hapi <span className="text-brand">{step}</span> prej 3</span></div>
        <MaroLogoProgress
          currentStep={step}
          highestStepReached={highestStepReached}
          onStepClick={onStepClick}
        />
        </div>
      </div>

      <h1 className="marologo-step-title mb-8">{title}</h1>

      <div className="space-y-8">{children}</div>

      <div className="mt-10">
        {nextExtra ?? (
          <Button
            type="button"
            className="h-[52px] w-full rounded-maro16 text-base font-semibold"
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
