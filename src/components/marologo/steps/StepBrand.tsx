"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import { WizardStepLayout } from "../ui/WizardStepLayout";
import { SearchableSelect } from "../ui/SearchableSelect";
import { INDUSTRIES, INDUSTRY_OTHER } from "@/lib/marologo/constants";
import type { MaroLogoWizardState, WizardStep } from "@/lib/marologo/types";

export function StepBrand({ step, highestStepReached, wizard, errors, onChange, onNext, onStepClick }: {
  step: WizardStep;
  highestStepReached: WizardStep;
  wizard: MaroLogoWizardState;
  errors: Record<string, string>;
  onChange: (patch: Partial<MaroLogoWizardState["brand"]>) => void;
  onNext: () => void;
  onStepClick?: (step: WizardStep) => void;
}) {
  const [contextOpen, setContextOpen] = React.useState(false);

  return (
    <WizardStepLayout step={step} highestStepReached={highestStepReached} title="Tregoja brendin." nextLabel="Vazhdo te drejtimi kreativ" nextDisabled={Object.keys(errors).length > 0} onNext={onNext} onStepClick={onStepClick}>
      <p className="-mt-5 text-center text-[15px] leading-relaxed text-ink-3">
        Dy përgjigje të mira mjaftojnë. Maro e nxjerr pjesën tjetër nga konteksti.
      </p>

      <Field label="Emri i brendit *" hint={errors.name}>
        <Input value={wizard.brand.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="p.sh. Luma" className="marologo-card h-[56px] border-0 bg-surface" autoFocus />
      </Field>

      <Field label="Çka bën brendi? *" hint={errors.description}>
        <Textarea value={wizard.brand.description} onChange={(e) => onChange({ description: e.target.value })} rows={4} placeholder="p.sh. Platformë SaaS që ua thjeshton financat bizneseve të vogla." className="marologo-card min-h-[132px] border-0 bg-surface" />
      </Field>

      <div className="rounded-maro16 bg-surface px-5">
        <button type="button" onClick={() => setContextOpen((open) => !open)} className="flex min-h-[56px] w-full items-center justify-between text-left" aria-expanded={contextOpen}>
          <span>
            <span className="block text-[14px] font-semibold text-ink">Shto kontekst</span>
            <span className="block text-[12px] text-ink-3">Audienca, industria ose slogani — opsionale</span>
          </span>
          <ChevronDown className={cn("h-4 w-4 text-ink-3 transition-transform", contextOpen && "rotate-180")} />
        </button>

        {contextOpen && (
          <div className="space-y-5 border-t border-line py-5">
            <Field label="Për kë është ky brend?" hint={errors.audience}>
              <Textarea value={wizard.brand.audience} onChange={(e) => onChange({ audience: e.target.value })} rows={2} placeholder="p.sh. Themelues jo-teknikë të bizneseve të vogla" className="marologo-card border-0 bg-canvas" />
            </Field>
            <SearchableSelect label="Industria" options={INDUSTRIES} value={wizard.brand.industry} onChange={(industry) => onChange({ industry })} otherTrigger={INDUSTRY_OTHER} otherValue={wizard.brand.industryOther} onOtherChange={(industryOther) => onChange({ industryOther })} otherLabel="Shkruaj industrinë" error={errors.industryOther} />
            <Field label="Slogani" hint={errors.slogan}>
              <Input value={wizard.brand.slogan} onChange={(e) => onChange({ slogan: e.target.value })} placeholder="Opsionale" className="marologo-card h-[52px] border-0 bg-canvas" />
            </Field>
          </div>
        )}
      </div>
    </WizardStepLayout>
  );
}
