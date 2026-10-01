"use client";

import { Flame, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MaroIcon } from "@/components/app/OptionIcon";
import type { MaroLogoWizardState, PresentationMode, WizardStep } from "@/lib/marologo/types";
import { WizardStepLayout } from "../ui/WizardStepLayout";
import { MiniReview } from "../ui/MiniReview";
import { PresentationModeCards } from "../ui/PresentationModeCards";

export function StepPresentation({ step, highestStepReached, wizard, cost, generating, fortAvailable, fortActive, hasFort, onChangePresentation, onOpenFort, onGenerate, onStepClick }: {
  step: WizardStep;
  highestStepReached: WizardStep;
  wizard: MaroLogoWizardState;
  cost: number;
  generating: boolean;
  fortAvailable: boolean;
  fortActive: boolean;
  hasFort: boolean;
  onChangePresentation: (mode: PresentationMode) => void;
  onOpenFort: () => void;
  onGenerate: () => void;
  onStepClick?: (step: WizardStep) => void;
}) {
  return (
    <WizardStepLayout step={step} highestStepReached={highestStepReached} title="Si don me e pa?" nextLabel="" onNext={() => {}} onStepClick={onStepClick} nextExtra={
      <div className="space-y-3">
        {fortAvailable && (
          <button type="button" onClick={onOpenFort} className="marologo-card flex min-h-[54px] w-full items-center justify-between px-5 text-left">
            <span className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-canvas"><Sparkles className="h-4 w-4" /></span><span><span className="block text-[13px] font-semibold text-ink">maroFort</span><span className="block text-[11px] text-ink-3">Kontrolle eksperte, pa e ngadalësu Standardin</span></span></span>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${fortActive ? "bg-fort-pill text-white" : "bg-canvas text-ink-3"}`}>{fortActive ? <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3" />Aktiv</span> : hasFort ? "Hape" : "Premium"}</span>
          </button>
        )}
        <Button type="button" className="h-[54px] w-full rounded-2xl text-[15px] font-semibold" disabled={generating} onClick={onGenerate}>
          <span className="inline-flex items-center gap-[10px]">{generating ? "Duke maru..." : "Maroje logon"}<MaroIcon name="coins" className="h-4 w-4" />{cost}</span>
        </Button>
      </div>
    }>
      <p className="-mt-5 text-center text-[15px] leading-relaxed text-ink-3">Prezantimi ndryshon mënyrën si e vlerëson identitetin — jo vetëm sfondin.</p>
      <PresentationModeCards value={wizard.presentation.mode} onChange={onChangePresentation} />
      <MiniReview wizard={wizard} />
    </WizardStepLayout>
  );
}
