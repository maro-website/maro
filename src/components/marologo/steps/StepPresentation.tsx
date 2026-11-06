"use client";

import { useLogoContent } from "../LogoContent";
import { Button } from "@/components/ui/Button";
import { MaroIcon } from "@/components/app/OptionIcon";
import type { MaroLogoWizardState, PresentationMode, WizardStep } from "@/lib/marologo/types";
import { WizardStepLayout } from "../ui/WizardStepLayout";
import { MiniReview } from "../ui/MiniReview";
import { PresentationModeCards } from "../ui/PresentationModeCards";

export function StepPresentation({ step, highestStepReached, wizard, cost, generating, svgCredits, outputSvg, hasReferences, onOutputSvg, onChangePresentation, onGenerate, onStepClick }: {
  step: WizardStep;
  highestStepReached: WizardStep;
  wizard: MaroLogoWizardState;
  cost: number | null;
  generating: boolean;
  svgCredits?: number;
  outputSvg?: boolean;
  hasReferences?: boolean;
  onOutputSvg?: (selected: boolean) => void;
  onChangePresentation: (mode: PresentationMode) => void;
  onGenerate: () => void;
  onStepClick?: (step: WizardStep) => void;
}) {
  const content = useLogoContent();
  return (
    <WizardStepLayout step={step} highestStepReached={highestStepReached} title={content["presentation.mode"].label} nextLabel="" onNext={() => {}} onStepClick={onStepClick} nextExtra={
      <div className="space-y-3">
        <Button type="button" className="h-[54px] w-full rounded-2xl text-[15px] font-semibold" disabled={generating || cost === null} onClick={onGenerate}>
          <span className="inline-flex items-center gap-[10px]">{generating ? "Duke maru..." : "Maroje logon"}<MaroIcon name="coins" className="h-4 w-4" />{cost ?? "…"}</span>
        </Button>
      </div>
    }>
      <p className="-mt-5 text-center text-[15px] leading-relaxed text-ink-3">Prezantimi ndryshon mënyrën si e vlerëson identitetin, përtej sfondit.</p>
      {content["presentation.mode"].help && <p className="text-ink-3">{content["presentation.mode"].help}</p>}
      {(svgCredits !== undefined || outputSvg) && (
        <fieldset className="marologo-card flex flex-wrap items-center gap-3 p-4">
          <legend className="px-1 text-sm font-semibold text-ink">Formati i logos</legend>
          <Button type="button" variant={outputSvg ? "secondary" : "primary"} aria-pressed={!outputSvg} onClick={() => onOutputSvg?.(false)}>PNG</Button>
          <Button type="button" variant={outputSvg ? "primary" : "secondary"} aria-pressed={Boolean(outputSvg)}
            disabled={svgCredits === undefined || hasReferences} onClick={() => onOutputSvg?.(true)}>SVG · {svgCredits ?? "–"} kredi</Button>
          <p className="w-full text-sm text-ink-3">{hasReferences ? "SVG krijohet nga përshkrimi. Hiqi fotot te Drejtimi për ta zgjedhur." : "SVG është logo vektoriale me sfond transparent."}</p>
        </fieldset>
      )}
      {!outputSvg && <PresentationModeCards value={wizard.presentation.mode} onChange={onChangePresentation} />}
      <MiniReview wizard={wizard} />
    </WizardStepLayout>
  );
}
