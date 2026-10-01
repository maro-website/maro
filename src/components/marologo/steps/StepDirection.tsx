"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Field, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import { CONCEPT_INTENTS, VISUAL_STYLE_OPTIONS } from "@/lib/marologo/constants";
import type { ConceptIntent, MaroLogoWizardState, UploadedReference, VisualStyle, WizardStep } from "@/lib/marologo/types";
import { WizardStepLayout } from "../ui/WizardStepLayout";
import { TraitPills } from "../ui/TraitPills";
import { LogoTypeCards } from "../ui/LogoTypeCards";
import { TypographyGrid } from "../ui/TypographyGrid";
import { ColorEditor } from "../ui/ColorEditor";
import { ReferenceUpload } from "../ui/ReferenceUpload";

export function StepDirection({
  step, highestStepReached, wizard, references, errors, onChangeTraits, onChangeLogo, onChangeLook,
  onChangeReferences, onMaxTraits, onToast, onNext, onStepClick,
}: {
  step: WizardStep;
  highestStepReached: WizardStep;
  wizard: MaroLogoWizardState;
  references: UploadedReference[];
  errors: Record<string, string>;
  onChangeTraits: (traits: string[]) => void;
  onChangeLogo: (patch: Partial<MaroLogoWizardState["logo"]>) => void;
  onChangeLook: (patch: Partial<MaroLogoWizardState["look"]>) => void;
  onChangeReferences: (refs: UploadedReference[]) => void;
  onMaxTraits: () => void;
  onToast: (message: string) => void;
  onNext: () => void;
  onStepClick?: (step: WizardStep) => void;
}) {
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const customDetails = wizard.look.typography !== "maro_decides" || wizard.look.colors.mode === "custom" || Boolean(wizard.logo.symbolMeaning || wizard.logo.mustInclude || wizard.logo.avoid || references.length);

  return (
    <WizardStepLayout step={step} highestStepReached={highestStepReached} title="Jepi një ndjesi." nextLabel="Zgjedh prezantimin" nextDisabled={Object.keys(errors).length > 0} onNext={onNext} onStepClick={onStepClick}>
      <div>
        <span className="marologo-field-label mb-[10px] block">Personaliteti · deri në 3</span>
        <TraitPills value={wizard.direction.traits} onChange={onChangeTraits} onMaxReached={onMaxTraits} />
        <p className="mt-2 text-[12px] text-ink-3">Mundesh me e lanë bosh — Maro e nxjerr nga biznesi dhe audienca.</p>
        {errors.traits && <p className="mt-2 text-[12px] text-danger">{errors.traits}</p>}
      </div>

      <div>
        <span className="marologo-field-label mb-[10px] block">Logo type</span>
        <LogoTypeCards value={wizard.logo.type} onChange={(type) => onChangeLogo({ type })} />
      </div>

      <div>
        <span className="marologo-field-label mb-[10px] block">Çka duhet me udhëheq konceptin?</span>
        <div className="grid gap-3 sm:grid-cols-2">
          {CONCEPT_INTENTS.map((item) => {
            const active = wizard.logo.conceptIntent === item.value;
            return (
              <button key={item.value} type="button" aria-pressed={active} onClick={() => onChangeLogo({ conceptIntent: item.value as ConceptIntent })} className={cn("marologo-card relative min-h-[104px] p-5 text-left transition-colors", active ? "ring-2 ring-brand" : "hover:bg-surface-hover")}>
                <span className="marologo-checkbox absolute right-4 top-4" data-checked={active || undefined}>{active && <Check className="h-4 w-4" strokeWidth={3} />}</span>
                <span className="block pr-10 text-[15px] font-semibold text-ink">{item.label}</span>
                <span className="mt-1 block text-[12px] leading-relaxed text-ink-3">{item.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <span className="marologo-field-label mb-[10px] block">Drejtimi vizual</span>
        <div className="flex flex-wrap gap-2.5">
          {VISUAL_STYLE_OPTIONS.map((item) => {
            const active = wizard.look.visualStyle === item.value;
            return <button key={item.value} type="button" aria-pressed={active} onClick={() => onChangeLook({ visualStyle: item.value as VisualStyle })} className="maro-chip-select min-h-[48px] px-4 py-2 text-[13px]" data-selected={active || undefined}>{item.label}</button>;
          })}
        </div>
      </div>

      <div className="rounded-maro16 bg-surface px-5">
        <button type="button" onClick={() => setDetailsOpen((open) => !open)} className="flex min-h-[62px] w-full items-center justify-between text-left" aria-expanded={detailsOpen}>
          <span>
            <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">Detaje kreative <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] uppercase tracking-wide text-ink-3">Opsionale</span></span>
            <span className="block text-[12px] text-ink-3">Koncept, tipografi, ngjyra, kufizime dhe referenca{customDetails ? " · të personalizuara" : ""}</span>
          </span>
          <ChevronDown className={cn("h-4 w-4 text-ink-3 transition-transform", detailsOpen && "rotate-180")} />
        </button>

        {detailsOpen && (
          <div className="space-y-7 border-t border-line py-6">
            <Field label="A ke një ide ose domethënie për simbolin?">
              <Textarea value={wizard.logo.symbolMeaning} onChange={(e) => onChangeLogo({ symbolMeaning: e.target.value })} rows={2} placeholder="p.sh. lidhje, shpejtësi, transformim — ose lëre Maron me vendos" className="marologo-card border-0 bg-canvas" />
            </Field>

            <div>
              <h3 className="mb-3 text-[14px] font-semibold text-ink">Tipografia</h3>
              <TypographyGrid value={wizard.look.typography} onChange={(typography) => onChangeLook({ typography })} />
            </div>

            <ColorEditor mode={wizard.look.colors.mode} values={wizard.look.colors.values} onModeChange={(mode) => onChangeLook({ colors: { ...wizard.look.colors, mode } })} onValuesChange={(values) => onChangeLook({ colors: { mode: "custom", values } })} error={errors.colors} />

            <Field label="Çka duhet patjetër me u përfshi?">
              <Textarea value={wizard.logo.mustInclude} onChange={(e) => onChangeLogo({ mustInclude: e.target.value })} rows={2} placeholder="Vetëm nëse është vërtet e domosdoshme" className="marologo-card border-0 bg-canvas" />
            </Field>
            <Field label="Çka nuk don me pa?">
              <Textarea value={wizard.logo.avoid} onChange={(e) => onChangeLogo({ avoid: e.target.value })} rows={2} placeholder="p.sh. pa kulme shtëpish, pa AI sparkles" className="marologo-card border-0 bg-canvas" />
            </Field>
            <ReferenceUpload references={references} onChange={onChangeReferences} onError={onToast} />
          </div>
        )}
      </div>
    </WizardStepLayout>
  );
}
